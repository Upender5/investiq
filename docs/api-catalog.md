# InvestIQ — Complete API Catalog

> Production-ready API design for an AI-powered investment platform for Indian college students.
> All endpoints require `Authorization: Bearer <access_token>` unless marked PUBLIC.
> All responses follow: `{ success, data, code, message, timestamp }` (ApiResponse wrapper).

---

## API Design Standards

| Standard | Value |
|---|---|
| Versioning | URI path — `/api/v1/` |
| Auth | JWT Bearer — 15-min access token + 7-day refresh |
| Pagination | `?page=0&size=20&sort=createdAt,desc` (Spring Pageable) |
| Filtering | Query params on list endpoints |
| Idempotency | `Idempotency-Key` header on all financial mutations |
| Correlation IDs | `X-Correlation-ID` header (auto-injected by API Gateway) |
| Tracing | OpenTelemetry W3C trace propagation via `traceparent` header |
| Date format | ISO 8601 UTC — `2025-06-09T10:30:00Z` |
| Money | `BigDecimal`, never `float` — minimum ₹10 |
| Error codes | SCREAMING_SNAKE_CASE — e.g. `INSUFFICIENT_FUNDS` |
| Rate limiting | 60 req/min per user (sliding window in Redis) |

---

## Part 1 — Auth Service (port 8081)

### Swagger UI: `http://localhost:8081/swagger-ui.html`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | PUBLIC | Register with name, phone, email, password |
| POST | `/api/v1/auth/login` | PUBLIC | Login with phone/email + password |
| POST | `/api/v1/auth/otp/send` | PUBLIC | Send OTP to Indian mobile number |
| POST | `/api/v1/auth/otp/verify` | PUBLIC | Verify OTP → receive access + refresh tokens |
| POST | `/api/v1/auth/refresh` | PUBLIC | Rotate access token using refresh token |
| POST | `/api/v1/auth/logout` | BEARER | Revoke one refresh token |
| POST | `/api/v1/auth/logout-all` | BEARER | Revoke all refresh tokens for user |
| GET  | `/api/v1/auth/me` | BEARER | Current user info from token |
| POST | `/api/v1/auth/forgot-password` | PUBLIC | Send password reset link |
| POST | `/api/v1/auth/reset-password` | PUBLIC | Set new password with reset token |
| POST | `/api/v1/auth/change-password` | BEARER | Change password (must know current) |
| POST | `/api/v1/auth/oauth/google` | PUBLIC | Login/register with Google ID token |
| POST | `/api/v1/auth/oauth/apple` | PUBLIC | Login/register with Apple identity token |
| GET  | `/api/v1/auth/devices` | BEARER | List trusted devices |
| POST | `/api/v1/auth/devices/register` | BEARER | Register device for push notifications |
| DELETE | `/api/v1/auth/devices/{deviceId}` | BEARER | Remove trusted device |
| POST | `/api/v1/auth/mfa/enable` | BEARER | Begin TOTP setup — returns secret + QR |
| POST | `/api/v1/auth/mfa/verify` | BEARER | Activate TOTP with first code |
| POST | `/api/v1/auth/mfa/disable` | BEARER | Disable MFA with valid TOTP code |

**Kafka Events Produced:**
- `investiq.user.registered` — on successful register/oauth
- `investiq.auth.login` — on every successful login (for fraud detection)
- `investiq.auth.device_registered` — on device registration

---

## Part 2 — User Service (port 8082)

### Swagger UI: `http://localhost:8082/swagger-ui.html`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET  | `/api/v1/users/me` | BEARER | Get own profile |
| PUT  | `/api/v1/users/me` | BEARER | Update name, email, DOB, occupation |
| GET  | `/api/v1/users/{id}` | ADMIN/SELF | Get profile by ID |
| GET  | `/api/v1/users/me/kyc` | BEARER | KYC status + documents |
| PUT  | `/api/v1/users/{id}/kyc` | BEARER | Submit KYC document |
| GET  | `/api/v1/users/me/addresses` | BEARER | List addresses |
| POST | `/api/v1/users/me/addresses` | BEARER | Add address |
| PUT  | `/api/v1/users/me/addresses/{id}` | BEARER | Update address |
| DELETE | `/api/v1/users/me/addresses/{id}` | BEARER | Delete address |
| GET  | `/api/v1/users/me/bank-accounts` | BEARER | List bank accounts (masked) |
| POST | `/api/v1/users/me/bank-accounts` | BEARER | Add bank account (penny-drop verify) |
| DELETE | `/api/v1/users/me/bank-accounts/{id}` | BEARER | Remove bank account |
| GET  | `/api/v1/users/me/nominees` | BEARER | List nominees |
| POST | `/api/v1/users/me/nominees` | BEARER | Add nominee |
| DELETE | `/api/v1/users/me/nominees/{id}` | BEARER | Remove nominee |
| GET  | `/api/v1/users/me/risk-profile` | BEARER | Risk assessment + allocation suggestion |
| POST | `/api/v1/users/me/risk-profile` | BEARER | Submit risk questionnaire |
| GET  | `/api/v1/goals` | BEARER | List financial goals |
| POST | `/api/v1/goals` | BEARER | Create goal |
| GET  | `/api/v1/goals/{id}` | BEARER | Get goal detail |
| PUT  | `/api/v1/goals/{id}` | BEARER | Update goal |
| DELETE | `/api/v1/goals/{id}` | BEARER | Delete goal |
| GET  | `/api/v1/admin/dashboard` | ADMIN | Admin metrics dashboard |
| GET  | `/api/v1/admin/users` | ADMIN | List all users |
| GET  | `/api/v1/admin/users/{id}` | ADMIN | User detail with full activity |
| PUT  | `/api/v1/admin/users/{id}/status` | ADMIN | Activate / suspend / close account |
| GET  | `/api/v1/admin/kyc` | COMPLIANCE | KYC review queue |
| PUT  | `/api/v1/admin/kyc/{id}/approve` | COMPLIANCE | Approve KYC submission |
| PUT  | `/api/v1/admin/kyc/{id}/reject` | COMPLIANCE | Reject with reason |
| GET  | `/api/v1/admin/features` | ADMIN | Feature flags list |
| PUT  | `/api/v1/admin/features/{flag}` | SUPER_ADMIN | Toggle feature flag |
| GET  | `/api/v1/admin/audit` | COMPLIANCE | Audit log query |

**Kafka Events Produced:**
- `investiq.user.kyc.submitted` — KYC document submitted
- `investiq.user.kyc.approved` / `.rejected` — KYC decision

---

## Part 3 — Trade Service (port 8083)

### Swagger UI: `http://localhost:8083/swagger-ui.html`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/orders` | BEARER | Place order (MARKET/LIMIT/SL/GTT) |
| GET  | `/api/v1/orders` | BEARER | List orders (?status&symbol&side) |
| GET  | `/api/v1/orders/{id}` | BEARER | Get single order |
| PUT  | `/api/v1/orders/{id}` | BEARER | Modify open LIMIT order |
| DELETE | `/api/v1/orders/{id}` | BEARER | Cancel order |
| GET  | `/api/v1/trades` | BEARER | Trade history (executed fills) |
| GET  | `/api/v1/positions` | BEARER | Live positions with P&L |
| GET  | `/api/v1/margins` | BEARER | Cash, margin and collateral |

**Business Rules:**
- Minimum order: ₹10
- KYC required before first trade (validated via inter-service call)
- Rate limit: 60 orders/min per user
- Idempotency-Key required on POST /orders

**Kafka Events Produced:**
- `investiq.order.created` — order placed
- `investiq.order.executed` — order filled
- `investiq.order.cancelled` — order cancelled

---

## Part 4 — Wallet Service (port 8084)

### Swagger UI: `http://localhost:8084/swagger-ui.html`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/wallets` | BEARER | Create wallet for user |
| GET  | `/api/v1/wallets/{id}` | BEARER | Get wallet balance |
| GET  | `/api/v1/wallets/by-user/{userId}` | BEARER | Get wallet by user |
| GET  | `/api/v1/wallets/{id}/transactions` | BEARER | Paginated ledger (double-entry) |
| POST | `/api/v1/wallets/{id}/deposit` | BEARER | Initiate deposit (requires Idempotency-Key) |
| POST | `/api/v1/wallets/{id}/deposit/{journalId}/confirm` | BEARER | Confirm and settle deposit |
| POST | `/api/v1/wallets/{id}/withdraw` | BEARER | Execute withdrawal |

**Kafka Events Produced:**
- `investiq.wallet.funded` — deposit confirmed (consumed by trade-service)
- `investiq.payment.completed` — withdrawal settled

---

## Part 5 — Market Data Service (port 8085)

### Swagger UI: `http://localhost:8085/swagger-ui.html`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET  | `/api/v1/market/quotes/{symbol}` | PUBLIC | Real-time quote |
| POST | `/api/v1/market/quotes/batch` | PUBLIC | Batch quotes (max 50) |
| GET  | `/api/v1/market/search?q=` | PUBLIC | Symbol search |
| GET  | `/api/v1/market/quotes/{symbol}/ohlcv` | PUBLIC | OHLCV candles |
| GET  | `/api/v1/market/status` | PUBLIC | NSE/BSE session status |
| GET  | `/api/v1/stocks` | PUBLIC | List all instruments (?sector&exchange&fnO) |
| GET  | `/api/v1/stocks/{symbol}` | PUBLIC | Stock detail |
| GET  | `/api/v1/stocks/top-gainers` | PUBLIC | Top N gainers |
| GET  | `/api/v1/stocks/top-losers` | PUBLIC | Top N losers |
| GET  | `/api/v1/stocks/52-week-high` | PUBLIC | 52-week highs today |
| GET  | `/api/v1/stocks/52-week-low` | PUBLIC | 52-week lows today |
| GET  | `/api/v1/stocks/{symbol}/fundamentals` | PUBLIC | P/E, EPS, ROE, holding pattern |
| GET  | `/api/v1/stocks/{symbol}/technicals` | PUBLIC | RSI, MACD, Bollinger Bands |
| GET  | `/api/v1/stocks/{symbol}/news` | PUBLIC | Latest news with sentiment |
| GET  | `/api/v1/stocks/{symbol}/financials` | PUBLIC | Quarterly/annual financials |
| GET  | `/api/v1/stocks/{symbol}/corporate-actions` | PUBLIC | Dividends, splits, bonuses |
| GET  | `/api/v1/watchlists` | BEARER | List watchlists with live quotes |
| POST | `/api/v1/watchlists` | BEARER | Create watchlist |
| GET  | `/api/v1/watchlists/{id}` | BEARER | Get watchlist |
| PATCH | `/api/v1/watchlists/{id}` | BEARER | Rename watchlist |
| DELETE | `/api/v1/watchlists/{id}` | BEARER | Delete watchlist |
| POST | `/api/v1/watchlists/{id}/items` | BEARER | Add symbol |
| DELETE | `/api/v1/watchlists/{id}/items/{symbol}` | BEARER | Remove symbol |

**Kafka Events Produced:**
- `investiq.market.price.tick` — real-time price tick (100 partitions, 1-day retention)
- `investiq.market.price.eod` — end-of-day OHLCV

---

## Part 6 — Notification Service (port 8086)

### Swagger UI: `http://localhost:8086/swagger-ui.html`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET  | `/api/v1/notifications` | BEARER | Paginated feed (?read&type) |
| GET  | `/api/v1/notifications/unread-count` | BEARER | Unread badge count |
| PUT  | `/api/v1/notifications/read-all` | BEARER | Mark all read |
| PUT  | `/api/v1/notifications/{id}/read` | BEARER | Mark single read |
| DELETE | `/api/v1/notifications/{id}` | BEARER | Delete notification |
| GET  | `/api/v1/notifications/settings` | BEARER | Get channel + category preferences |
| PUT  | `/api/v1/notifications/settings` | BEARER | Update preferences |

**Channels:** Push (FCM), Email (SES), SMS (MSG91), WhatsApp (Gupshup)
**Categories:** ORDER_UPDATE, PRICE_ALERT, PORTFOLIO_SUMMARY, MARKET_NEWS, KYC_STATUS, OFFERS

**Kafka Events Consumed:**
- `investiq.order.executed` → order fill notification
- `investiq.user.kyc.approved/rejected` → KYC notification
- `investiq.notification.send` → direct send request

---

## Part 7 — Fund Service (port 8087)

### Swagger UI: `http://localhost:8087/swagger-ui.html`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET  | `/api/v1/mutual-funds` | PUBLIC | Browse funds (?category&risk&amc) |
| GET  | `/api/v1/mutual-funds/{schemeCode}` | PUBLIC | Fund detail + NAV history |
| GET  | `/api/v1/mutual-funds/search?q=` | PUBLIC | Search by name/AMC/ISIN |
| GET  | `/api/v1/mutual-funds/top-rated` | PUBLIC | Top funds by CRISIL rating |
| POST | `/api/v1/mutual-funds/invest` | BEARER | Lump-sum investment (min ₹500) |
| POST | `/api/v1/mutual-funds/{code}/redeem` | BEARER | Redeem units/amount |
| GET  | `/api/v1/mutual-funds/holdings` | BEARER | User's MF portfolio |
| POST | `/api/v1/sip` | BEARER | Create SIP mandate |
| GET  | `/api/v1/sip` | BEARER | List active SIPs |
| GET  | `/api/v1/sip/{id}` | BEARER | SIP detail + instalment history |
| PUT  | `/api/v1/sip/{id}` | BEARER | Pause/resume/change amount |
| DELETE | `/api/v1/sip/{id}` | BEARER | Cancel SIP |

**Kafka Events Produced:**
- `investiq.fund.investment.created` — lump-sum placed
- `investiq.fund.sip.created/cancelled` — SIP lifecycle
- `investiq.fund.redemption.created` — redemption requested

---

## Part 8 — AI Service (port 9001)

### Swagger UI: `http://localhost:9001/docs`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/advisor/recommend` | BEARER | Personalised investment recommendation |
| POST | `/api/v1/ai/chat` | BEARER | Conversational AI advisor |
| GET  | `/api/v1/ai/chat/conversations` | BEARER | List all conversations |
| GET  | `/api/v1/ai/chat/conversations/{id}` | BEARER | Full message history |
| DELETE | `/api/v1/ai/chat/conversations/{id}` | BEARER | Delete conversation |
| POST | `/api/v1/ai/portfolio/review` | BEARER | AI portfolio health review |
| POST | `/api/v1/ai/stocks/analyze` | BEARER | AI stock fundamental + technical analysis |
| POST | `/api/v1/ai/risk-assessment` | BEARER | AI portfolio risk assessment + VaR |
| POST | `/api/v1/ai/goal-planner` | BEARER | Goal simulation + instrument recommendations |
| GET  | `/api/v1/ai/recommendations` | BEARER | Personalised recommendations |
| GET  | `/api/v1/ai/goals/{id}/recommendation` | BEARER | AI plan for a specific goal |

**All responses include mandatory SEBI disclaimer.**
**Model:** Claude Sonnet 4.6 (`claude-sonnet-4-6`)
**Caching:** Redis 6h TTL on identical requests

---

## Part 9 — Analytics Service (port 9003)

### Swagger UI: `http://localhost:9003/docs`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET  | `/api/v1/analytics/dashboard` | BEARER | Main dashboard summary |
| GET  | `/api/v1/analytics/portfolio` | BEARER | Portfolio with positions and P&L |
| GET  | `/api/v1/analytics/pnl-history?days=30` | BEARER | Daily P&L history |
| GET  | `/api/v1/analytics/top-holdings` | BEARER | Top 5 holdings by value |
| GET  | `/api/v1/analytics/allocation` | BEARER | Sector + asset class allocation |
| GET  | `/api/v1/analytics/performance?period=1Y` | BEARER | XIRR, alpha, Sharpe ratio |
| GET  | `/api/v1/analytics/user` | BEARER | Behavioural insights |
| GET  | `/api/v1/analytics/market` | BEARER | FII/DII, sentiment, VIX |
| GET  | `/api/v1/analytics/reports/capital-gains` | BEARER | STCG/LTCG report |
| GET  | `/api/v1/analytics/reports/tax` | BEARER | Full tax P&L report |

---

## Part 10 — ML Scoring Service (port 9002)

### Swagger UI: `http://localhost:9002/docs`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET  | `/api/v1/scoring/risk/{userId}` | BEARER | User risk score (LOW/MEDIUM/HIGH) |
| GET  | `/api/v1/scoring/sentiment/{symbol}` | BEARER | Stock sentiment score + signal |
| GET  | `/api/v1/scoring/portfolio-health/{userId}` | BEARER | Portfolio health assessment |

---

## Standard Response Formats

### Success
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-06-09T10:30:00Z"
}
```

### Validation Error (400)
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "phone: Must be a valid Indian mobile number",
  "timestamp": "2025-06-09T10:30:00Z"
}
```

### Business Error (422)
```json
{
  "success": false,
  "code": "INSUFFICIENT_FUNDS",
  "message": "Wallet balance ₹450 is insufficient for order value ₹500",
  "timestamp": "2025-06-09T10:30:00Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "content": [ ... ],
    "page": 0,
    "size": 20,
    "totalElements": 150,
    "totalPages": 8,
    "last": false
  }
}
```

---

## Error Codes Reference

| Code | HTTP | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body / param validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `TOKEN_EXPIRED` | 401 | Access token expired — call /refresh |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `DUPLICATE_REQUEST` | 409 | Idempotency key already used |
| `KYC_REQUIRED` | 422 | KYC must be completed before this action |
| `INSUFFICIENT_FUNDS` | 422 | Wallet balance too low |
| `MARKET_CLOSED` | 422 | Cannot place order outside market hours |
| `ORDER_LIMIT_EXCEEDED` | 429 | 60 orders/min rate limit hit |
| `RATE_LIMITED` | 429 | General rate limit hit |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `UPSTREAM_ERROR` | 502 | Broker/provider temporarily unavailable |

---

## Security Architecture

| Layer | Mechanism |
|---|---|
| Authentication | JWT HS256 (access 15m, refresh 7d) + OTP fallback |
| OAuth | Google OIDC + Apple Sign In (verify ID token server-side) |
| MFA | TOTP (RFC 6238) via Authenticator apps |
| Role-based | STUDENT, ADMIN, SUPPORT, COMPLIANCE, SUPER_ADMIN |
| Transport | TLS 1.3 (API Gateway → services via mTLS) |
| Rate limiting | Redis sliding window — 60 req/min per user |
| Bot protection | API Gateway WAF rules |
| Fraud detection | ML scoring + real-time Kafka event analysis |
| Secrets | AWS Secrets Manager (production), .env (local dev) |
| API audit | Every request logged with user, IP, endpoint, latency |

---

## Kafka Event Catalog

| Topic | Partitions | Retention | Producer | Consumer(s) |
|---|---|---|---|---|
| `investiq.user.registered` | 12 | 30d | auth | user, notification, wallet |
| `investiq.user.kyc.submitted` | 6 | 90d | user | notification, compliance |
| `investiq.user.kyc.approved` | 6 | 90d | user | trade, notification |
| `investiq.wallet.funded` | 24 | 30d | wallet | trade |
| `investiq.order.created` | 48 | 30d | trade | notification, analytics |
| `investiq.order.executed` | 48 | 30d | trade | wallet, notification, analytics |
| `investiq.order.cancelled` | 24 | 30d | trade | notification |
| `investiq.market.price.tick` | 100 | 1d | market-data | analytics, background-jobs |
| `investiq.notification.send` | 24 | 7d | * | notification |
| `investiq.audit.event` | 24 | 5y | * | audit-store (Kafka Streams) |

---

## Production Readiness Checklist

- [x] JWT auth with rotation on every refresh (token family tracking)
- [x] Idempotency keys on all financial mutations
- [x] Double-entry ledger for all wallet transactions
- [x] KYC gate before trading
- [x] Kafka for all inter-service events (no synchronous coupling)
- [x] Flyway migrations for all services
- [x] Horizontal Pod Autoscaling (K8s HPA)
- [x] Health checks on all services (`/actuator/health`)
- [x] API versioning (`/api/v1/`)
- [x] Swagger/OpenAPI on every service
- [x] Mandatory AI disclaimer on all AI responses
- [ ] mTLS between services (pending Istio setup)
- [ ] Distributed tracing (pending OpenTelemetry collector)
- [ ] SEBI audit trail reporting (pending compliance review)
