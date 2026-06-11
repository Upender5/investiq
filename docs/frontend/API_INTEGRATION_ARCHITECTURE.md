# InvestIQ — Frontend ⇄ Backend API Integration Architecture

> Production integration design for the InvestIQ web admin/app (Next.js 15) and mobile app (Expo).
> Reflects the **implemented** state of the data layer, auth, guards and the canonical response envelope.
> Companion to [api-catalog.md](../api-catalog.md) (full route inventory) and
> [COMPONENT_ARCHITECTURE.md](./COMPONENT_ARCHITECTURE.md).

Legend: ✅ implemented · 🟡 partial · ⬜ planned

---

## 0. Canonical Response Envelope ✅

Every service — 7 Spring Boot + 3 FastAPI — returns exactly:

```json
{ "message": "Human readable status", "data": <payload | null> }
```

| Case | Shape | HTTP |
|---|---|---|
| Success | `{ "message": "Success", "data": {...} }` | 200/201 |
| List | `{ "message": "Success", "data": { "content": [...], "page": 0, ... } }` | 200 |
| Empty success | `{ "message": "Success", "data": null }` | 200/204 |
| Validation error | `{ "message": "Validation failed", "data": { "field": "error" } }` | 400 |
| Unauthorized | `{ "message": "Unauthorized", "data": null }` | 401 |
| Forbidden | `{ "message": "Access denied", "data": null }` | 403 |
| Not found | `{ "message": "...not found", "data": null }` | 404 |
| Server error | `{ "message": "Something went wrong", "data": null }` | 500 |

**Enforcement (no per-endpoint boilerplate):**
- **Java:** a `ResponseEnvelopeAdvice` (`ResponseBodyAdvice`) auto-wraps every controller return value; a unified
  `GlobalExceptionHandler` per service maps exceptions → envelope with the right status. Bodies already wrapped pass through.
- **Python:** `app/envelope.py` registers an `EnvelopeMiddleware` + exception handlers via `install_envelope(app)`.
- **Frontend:** `unwrap(res)` returns `res.data.data`; `unwrapPage(res)` flattens `data.content`. Tolerant of raw bodies.

---

## 1. Frontend Route Map ✅ / 🟡

### Public (unauthenticated)
| Route | Page | Status |
|---|---|---|
| `/login` | OTP login (phone) | ✅ |
| `/login` (email/password, register, forgot, reset) | tabs | ⬜ |

### Protected (`/dashboard/*`, gated by middleware + `AuthGuard`)
| Route | APIs | Status |
|---|---|---|
| `/dashboard` | analytics/dashboard, trades, goals, ai/recommendations, scoring/health, wallet | ✅ |
| `/dashboard/portfolio` | analytics/portfolio | ✅ |
| `/dashboard/portfolio/rebalance` | analytics/allocation | 🟡 (targets/suggestions need backend) |
| `/dashboard/market` | stocks | ✅ |
| `/dashboard/market/stocks/[symbol]` | quotes, ohlcv, financials, ai/stocks/analyze, scoring/sentiment | ✅ |
| `/dashboard/trades` | orders (GET/POST), trades | ✅ |
| `/dashboard/wallet` | wallets/by-user, transactions, deposit, withdraw | ✅ |
| `/dashboard/funds` | mutual-funds, invest, sip | ✅ |
| `/dashboard/notifications` | notifications, read, read-all | ✅ |
| `/dashboard/ai-advisor` | ai/chat | ✅ |
| `/dashboard/ai-advisor/health` | scoring/portfolio-health | ✅ |
| `/dashboard/ai-advisor/goals` | goals + ai/goal-planner | ✅ |
| `/dashboard/ai-advisor/screener` | (no backend yet) | ⬜ |
| `/dashboard/reports/capital-gains` | analytics/reports/capital-gains | ✅ |
| `/dashboard/community`, `/learn`, `/ipo` | (no backend yet) | ⬜ |
| `/dashboard/profile` | users/me | ✅ |
| `/dashboard/unauthorized` | — (403 landing) | ✅ |

### Admin subtree (`/dashboard/admin/*`, gated by `RoleGuard`) ⬜
`/admin`, `/admin/users`, `/admin/kyc`, `/admin/audit`, `/admin/features`, `/admin/fraud` → `/api/v1/admin/*`.

---

## 2. API Route Inventory ✅
See [api-catalog.md](../api-catalog.md) — all 10 services, every route, grouped by service, with auth level and Kafka events.

---

## 3. Screen → API Mapping ✅
Each page consumes typed React Query hooks in `lib/hooks/*` (one file per service). Every hook calls a single service
client from `lib/api.ts` and returns `unwrap`-ed data. No screen fabricates data; all reads/writes hit live APIs. Loading,
empty and error states are rendered from query state (`isLoading`, empty arrays, `getApiErrorMessage`).

---

## 4. Authentication Flow ✅ (OTP) / ⬜ (others)

```
Phone OTP (implemented):
  POST /auth/otp/send  → server sends OTP
  POST /auth/otp/verify {phone, otp} → { accessToken, refreshToken, userId }
  saveTokens() → localStorage + SameSite cookie mirror → /dashboard

Email/password (planned):  POST /auth/login → tokens
Register (planned):        POST /auth/register → tokens
Forgot/Reset (planned):    POST /auth/forgot-password ; POST /auth/reset-password
MFA (planned):             POST /auth/mfa/enable|verify|disable (TOTP)
Devices (planned):         GET/POST/DELETE /auth/devices
```

### Token lifecycle (rotation) ✅
```
request → 401 → single-flight POST /auth/refresh {refreshToken}
        → new {accessToken, refreshToken} (rotation) → saveTokens → retry original
        → refresh fails → clearTokens → redirect /login
```
Concurrent 401s share one `refreshPromise` (no stampede). Auth endpoints are excluded from the retry to avoid loops.

---

## 5. OAuth2 Social Login Flow ⬜ (Authorization Code + PKCE)
```
[Login] → build authorize URL with code_challenge (S256), store code_verifier (sessionStorage)
        → provider consent → redirect /login/callback?code=...
        → POST /auth/oauth/google|apple { code, code_verifier, redirectUri }
        → backend verifies, returns InvestIQ tokens → saveTokens → /dashboard
```
Backend has `/auth/oauth/google` and `/auth/oauth/apple`. GitHub/Facebook are **not** in the backend and need server endpoints first.

---

## 6. Protected-Route Strategy ✅ (defense in depth)
1. **Edge** — `middleware.ts` reads the `investiq_token` cookie, checks expiry, gates `/dashboard/*`, redirects
   `/login` for authed users, and `/dashboard/unauthorized` for admin paths the role can't access.
2. **Client** — `AuthGuard` (in dashboard layout) re-checks token on client-side navigations; `RoleGuard` wraps the
   admin subtree by required permission.
3. **API** — every request carries `Authorization: Bearer`; 401 triggers refresh-or-logout.

---

## 7. Permission Matrix ✅ (`lib/rbac.ts`)

| Permission | STUDENT | SUPPORT | COMPLIANCE | ADMIN | SUPER_ADMIN |
|---|:--:|:--:|:--:|:--:|:--:|
| portfolio:read / trade:write / wallet:write | ✅ | | | | |
| admin:dashboard | | ✅ | ✅ | ✅ | ✅ |
| admin:users:read | | ✅ | ✅ | ✅ | ✅ |
| admin:users:write | | | | ✅ | ✅ |
| admin:kyc:read / write | | | ✅ | ✅ | ✅ |
| admin:audit:read | | | ✅ | ✅ | ✅ |
| admin:features:read | | | | ✅ | ✅ |
| admin:features:write | | | | | ✅ |
| admin:fraud:read | | | ✅ | ✅ | ✅ |

Roles are decoded from the JWT (`roles` / `authorities` / `scope`, `ROLE_` stripped). Route→permission rules live in `ROUTE_PERMISSIONS`.

---

## 8. API Client Architecture ✅ (`lib/api.ts`)
- **Per-service Axios instances** (auth, user, trade, wallet, market, notification, funds, analytics, scoring, ai, admin) with env-driven base URLs.
- **Request interceptor** → injects Bearer token.
- **Response interceptor** → `RefreshTokenHandler` (single-flight rotation + retry), forced logout fallback.
- **`unwrap` / `unwrapPage`** → response transformer for the envelope.
- **`getApiErrorMessage`** → global error message extractor.
- **Idempotency-Key** header auto-attached on financial mutations (orders, deposit, withdraw).
- Mobile (`mobile-app/lib/api.ts`) mirrors the same interceptor + refresh design.

---

## 9. State Management ✅ (TanStack Query)
- `QueryClientProvider` in `app/providers.tsx` (staleTime 30s, retry 1, no refetch-on-focus).
- Server state via `useQuery`/`useMutation`; cache keyed by `[service, resource, params]`.
- Mutations `invalidateQueries` on success (e.g. placing an order invalidates `trade` + `analytics`).
- Polling: quotes every 15s, market status every 60s.
- Auth/session state is token-derived (localStorage + cookie), not in a global store.

---

## 10. Error Handling ✅
| Layer | Behavior |
|---|---|
| Network/5xx | surfaced via `getApiErrorMessage`; React Query `retry: 1` |
| 401 | refresh-and-retry; on failure → logout + redirect |
| 403 | route → `/dashboard/unauthorized`; inline → message |
| 400 validation | `data` map of field→error shown inline |
| Empty | dedicated empty states per screen (no fabricated fallback) |

---

## 11. Loading Strategy ✅
- `isLoading` spinners / skeletons per screen; `placeholderData: []` keeps lists render-safe.
- Guards show a full-screen loader until auth is resolved (prevents protected-content flash).

---

## 12. Session Management ✅ / 🟡
- Access token (15 min) + refresh token (7 day, rotated each refresh).
- `localStorage` for SPA reads + `SameSite=Lax` cookie mirror for edge middleware. Refresh token never leaves localStorage.
- `logout()` / `clearTokens()` clears both and the cookie. `isTokenExpired()` checks `exp`.
- ⬜ Idle session timeout + multi-device session list UI.

---

## 13. Security Architecture
| Concern | State |
|---|---|
| JWT Bearer + rotation | ✅ |
| RBAC + permission gates | ✅ |
| Idempotency on money flows | ✅ |
| Rate-limit awareness (429 surfaced) | ✅ |
| OAuth2 PKCE | ⬜ |
| CSRF (token in header, not cookie auth) | ✅ by design |
| XSS — token in localStorage | 🟡 (cookie is non-httpOnly for middleware; harden to httpOnly+BFF later) |
| Device validation / MFA | ⬜ |

---

## 14. Frontend Folder Structure ✅
```
admin-dashboard/
  middleware.ts            # edge auth + RBAC gate
  app/
    login/                 # public auth
    dashboard/             # protected app + admin subtree
    providers.tsx          # React Query + theme
  lib/
    api.ts                 # clients, interceptors, refresh, unwrap
    auth.ts                # token storage, JWT decode, roles, cookie mirror
    rbac.ts                # roles, permission matrix, route rules (edge-safe)
    hooks/                 # one file per service (typed React Query hooks)
    format.ts utils.ts theme.tsx
  components/
    auth/                  # otp-form, route-guard (AuthGuard/RoleGuard)
    ui/ layout/ dashboard/ charts/ brand/
  types/index.ts
mobile-app/                # Expo client mirroring api/auth
```

---

## 15. Production-Ready Integration Design — status
**Done:** unified envelope across 10 services; resilient API client with token rotation; edge + client route guards;
RBAC/permission matrix; fully API-driven screens with real loading/empty/error states (no mock data); idempotent money flows.
**Remaining:** full auth UI (email/register/forgot/reset/MFA/devices + OAuth PKCE), admin panel screens on `/admin/*`,
GitHub/Facebook OAuth backend, httpOnly/BFF token hardening, idle-timeout, backends for community/learn/ipo/screener.
