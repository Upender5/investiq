# InvestIQ — Brand Identity System

> AI-powered investing, made intelligent. A premium, modern, AI-first fintech identity built to stand beside Stripe, Robinhood, Wealthfront, CRED and Revolut.

---

## 1. Brand essence

| | |
|---|---|
| **Mission** | Make intelligent wealth creation accessible to every Indian investor. |
| **Personality** | Premium · Modern · Professional · Intelligent · Trustworthy · Global |
| **Pillars** | Wealth creation · Financial intelligence · Trust · Growth · Innovation · AI-first |
| **Voice** | Confident but never arrogant. Clear over clever. Always discloses risk (see §10). |
| **Anti-pattern** | No generic banking blues, no gold coins, no skeuomorphic vaults, no clip-art charts. |

---

## 2. Logo

The mark is a stylized **IQ monogram** where an **upward growth arrow breaks out of the "Q"** — the intelligence ("IQ") and the growth ("the arrow leaving the circle") are one gesture. Minimal, geometric, single-weight strokes.

### Assets
| File | Use |
|---|---|
| [`logo/investiq-primary-light.svg`](logo/investiq-primary-light.svg) | Full logo on light backgrounds |
| [`logo/investiq-primary-dark.svg`](logo/investiq-primary-dark.svg) | Full logo on dark / photo backgrounds (accent shifts to `#22C55E`) |
| [`logo/investiq-symbol.svg`](logo/investiq-symbol.svg) | Symbol only — avatars, nav, app chrome, ≤32px contexts |

### Logo concepts considered
1. **IQ + growth arrow** ✅ *selected primary* — arrow integrated into the Q.
2. AI brain + financial chart — too detailed below 32px.
3. Abstract wealth symbol — strong but loses the "IQ" equity.
4. Modern "IQ" monogram — retained as the fallback symbol mark.
5. Shield + growth graph — reserved for the Security / KYC sub-brand.

### Construction & scaling
- Built on a 100×100 grid. The Q ring, I bar and arrow share one optical stroke weight (12–13 units).
- Verified legible from **16px favicon → billboard**. Below 24px, use the symbol only (drop the wordmark).
- Wordmark is set in **Inter, 700, letter-spacing −1**; "IQ" always takes the accent color.

### Clear space & don'ts
- Clear space on all sides = height of the "I" bar.
- ❌ Don't recolor the wordmark, rotate the mark, add shadows/gradients, outline it, or place the light logo on a busy/low-contrast background.
- ❌ Don't separate the arrow from the Q or change the arrow angle.

---

## 3. Color system

### Core palette
| Role | Name | Hex | Notes |
|---|---|---|---|
| Primary | Emerald green | `#00C853` | Brand signal, CTAs, "IQ", positive states |
| Accent | Financial green | `#22C55E` | Accent on dark, charts, hover, AI accent |
| Base | Deep charcoal | `#0F172A` | Primary text, dark surfaces, logo |
| Surface | Slate 800 | `#1E293B` | Dark-mode cards, borders on dark |

### Neutral / gray scale
`#F8FAFC` `#F1F5F9` `#E2E8F0` `#CBD5E1` `#94A3B8` `#64748B` `#334155` `#0F172A`

### Semantic
| State | Hex |
|---|---|
| Success / gain | `#00C853` |
| Danger / loss | `#EF4444` |
| Warning | `#F59E0B` |
| Info | `#3B82F6` |

### Light & dark mode
| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FFFFFF` | `#0F172A` |
| `--surface` | `#F8FAFC` | `#1E293B` |
| `--text` | `#0F172A` | `#F1F5F9` |
| `--text-muted` | `#64748B` | `#94A3B8` |
| `--border` | `#E2E8F0` | `#1E293B` |
| `--brand` | `#00C853` | `#22C55E` |

> Accessibility: charcoal-on-white and white-on-charcoal pass AA. Never put `#00C853` text on white for body copy (fails contrast) — use it for fills, icons and large display only; pair with charcoal text on green fills.

---

## 4. Typography

| Role | Typeface | Usage |
|---|---|---|
| **Primary** | **Inter** (Display weights 600/700) | Wordmark, headings, hero numbers |
| **Secondary / body** | **Inter** 400/500 | UI labels, paragraphs, captions |
| **Numerals / figures** | **JetBrains Mono** 500 | Prices, returns, tickers, tabular financial data |

- Tabular, lining figures everywhere money appears. Money is always `BigDecimal`-formatted, never truncated floats.
- Headings use tight tracking (−0.5 to −1). Body is sentence case — never ALL CAPS.
- Alternatives if Inter is unavailable: **Geist** (primary), **Satoshi** (display).

---

## 5. App icons

| Platform | Spec | File |
|---|---|---|
| iOS | Charcoal squircle, white Q + emerald arrow, `rx=22%` | [`icons/app-icon-ios.svg`](icons/app-icon-ios.svg) |
| Android | Adaptive: round/circle, charcoal bg, accent `#22C55E` arrow | derive from symbol |
| PWA | Emerald `#00C853` tile, charcoal mark (high-energy variant) | derive from symbol |
| Favicon | Charcoal rounded tile, 16/32/48px | [`icons/favicon.svg`](icons/favicon.svg) |

Principle: **one symbol, three backgrounds** (charcoal, charcoal-round, emerald). High contrast, no text, recognizable at 24px.

---

## 6. Design-system icons

A single outline family — **Lucide / Material Design 3 outline**, consistent 2px (1.5–2.25) stroke, rounded joins, 24px grid. In code we ship the [Tabler](https://tabler.io/icons) outline set (Lucide-compatible) to guarantee one stroke language across web + mobile.

| Module | Icon | Module | Icon |
|---|---|---|---|
| Dashboard | `layout-dashboard` | AI advisor | `sparkles` (emerald) |
| Markets | `chart-candle` | Notifications | `bell` |
| Stocks | `trending-up` | Settings | `settings` |
| Mutual funds | `chart-pie` | Profile | `user` |
| ETFs | `stack-2` | Security | `shield-lock` |
| Bonds | `certificate` | KYC | `id-badge-2` |
| IPO | `rocket` | Payments | `credit-card` |
| Portfolio | `briefcase` | Analytics | `chart-bar` |
| Goals | `target` | Admin | `shield-cog` |
| Watchlist | `eye` | Research | `microscope` |

Rules: outline only (no filled variants except active nav state), default `--text`, AI-related icons may take the emerald accent, never mix stroke weights.

---

## 7. AI branding

- **Naming:** product surface is **InvestIQ Copilot**; the in-product assistant persona is **IQ**. ("InvestIQ AI" used for legal/marketing references.)
- **AI signature icon:** `sparkles` in emerald — the single, consistent visual cue for anything AI-generated.
- **AI avatar:** charcoal circle + emerald `sparkles`.
- **AI badge:** pill, `#D1FAE5` bg / `#065F46` text, sparkles + "AI". Marks AI-generated content.
- **IQ insight cards:** charcoal surface, emerald "IQ insight" eyebrow with sparkles, single-line takeaway.
- Every AI response must carry the disclaimer (§10).

---

## 8. Brand assets & motion

- **Splash screen:** charcoal background, centered symbol, arrow draws upward on launch.
- **Loading animation:** the growth arrow strokes from the Q's interior up-and-out (path-draw), looped; or a 3-dot emerald pulse.
- **Empty states:** light line illustration (single emerald accent) + one-line copy + primary CTA. e.g. empty portfolio → outline briefcase with a dotted rising arrow.
- **Social / OG:** charcoal canvas, symbol top-left, white headline, emerald underline accent. 1200×630.
- **Marketing site:** charcoal hero, large Inter display headline, emerald CTA, mono numbers in stat strips, generous whitespace (Stripe/Wealthfront cadence).

---

## 9. Deliverables index

1. Primary logo — `logo/investiq-primary-light.svg`
2. Secondary / reversed logo — `logo/investiq-primary-dark.svg`
3. Symbol / app mark — `logo/investiq-symbol.svg`
4. App icon — `icons/app-icon-ios.svg`
5. Favicon — `icons/favicon.svg`
6. Icon library — §6 (Tabler outline mapping)
7. AI branding assets — §7
8. Color system — §3
9. Typography system — §4
10. Brand guidelines — this document

---

## 10. Mandatory disclaimer

> Investments are subject to market risks. Read all scheme-related documents carefully. InvestIQ AI provides information, not personalised financial advice.

Must appear on every AI response, recommendation surface, and marketing claim involving returns.
