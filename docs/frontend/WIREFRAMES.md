# InvestIQ — High-Fidelity Wireframes (Core Screens)

> Design principles: **visual simplicity, financial trust, AI guidance**.
> Approachable like a modern fintech app, powerful enough for active investors.
> No cluttered broker-style UI — one primary job per screen, AI woven throughout.

All screens live inside the app shell: fixed left **Sidebar** (240 px) + scrollable content area.
Every screen renders instantly from mock placeholders and hydrates from live services
(see `lib/hooks/`). Tokens support light & dark mode (dark default).

---

## 1. Dashboard — `/dashboard`

```
┌─────────┬──────────────────────────────────────────────────────────────────┐
│         │  Overview                                  [Buy] [Sell] [Add ₹]  │
│ SIDEBAR │  Welcome back — your portfolio at a glance                       │
│         │ ┌───────────────┬───────────────┬──────────────┬───────────────┐ │
│ ⌂ Over- │ │ Portfolio Val │ Total P&L     │ Active Pos.  │ Wallet Bal.   │ │
│   view  │ │ ₹1,25,430.50  │ +₹18,320 ▲17% │ 12           │ ₹12,450       │ │
│ ▤ Mkts  │ └───────────────┴───────────────┴──────────────┴───────────────┘ │
│ ▦ Port- │ ┌──────────────────────────────────────────────[Ask Copilot →]─┐ │
│   folio │ │ 🧠 AI INSIGHTS                                               │ │
│ ⇄ Trades│ │ ✦ WIPRO up 17.8% — consider booking partial profits          │ │
│ 🧠 AI   │ │ ⚠ IT sector 42% of portfolio — rebalancing advised           │ │
│ ◔ Wallet│ │ ◈ ₹12,450 idle cash — auto-invest in Liquid Fund (6.8%)      │ │
│ ▤ Rep.  │ └──────────────────────────────────────────────────────────────┘ │
│ ⊙ Learn │ ┌───────────────────────────────────┬──────────────────────────┐ │
│ ☺ Comm. │ │ P&L HISTORY        [FY 2025–26]   │ QUICK STATS              │ │
│ 🔔 Notif│ │   ___/\        ____/              │ Unrealised  +₹18,320     │ │
│ ◉ Prof. │ │  /    \______/                    │ Return      +17.10%      │ │
│         │ │ /  (area chart, profit-green)     │ Today       +₹892.40     │ │
│ ────────│ │ Nov'25      Total: +₹18,320  Jun  │ [View Portfolio]         │ │
│ ◐ theme │ └───────────────────────────────────┤ [⚡ Health: 68/100]      │ │
│ U  Pro  │ ┌───────────────[Manage Goals →]────┴──────────────────────────┐ │
└─────────┤ │ ◎ GOAL PROGRESS                                              │ │
          │ │ Retirement ▓░░ 0.4%   House ▓▓░ 19%   Emrg ▓▓▓ 70%  Edu 2.4% │ │
          │ └──────────────────────────────────────────────────────────────┘ │
          │ ┌───────────────────────────────────────────────[View all →]──┐  │
          │ │ RECENT TRADES   Symbol Side Qty Price  Status   Date         │ │
          │ │                 INFY   BUY  10  ₹1,680 EXECUTED 09 Jun 2026  │ │
          │ └──────────────────────────────────────────────────────────────┘ │
          └──────────────────────────────────────────────────────────────────┘
```

**Data bindings** — `useDashboardAnalytics` (analytics:9003 `/analytics/dashboard`),
`useAiRecommendations` (ai:9001 `/ai/recommendations`), `usePortfolioHealth`
(scoring:9002), `useGoals` (user:8082 `/goals`), `useTradeHistory` (trade:8083
`/trades`), `useWallet` (wallet:8084 `/wallets/by-user/{id}`).

---

## 2. Stock Detail — `/dashboard/market/stocks/[symbol]`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Markets                                                            │
│ RELIANCE  [Energy] [NSE] [AI: BULLISH]                  ₹2,620.50            │
│ Reliance Industries Ltd                                 ▲ +₹35.50 (+1.37%)   │
│ ┌──────────────────────────────────────────────┬───────────────────────────┐ │
│ │ PRICE CHART      [1D 1W 1M 3M̲ 1Y 5Y]         │ PLACE ORDER (sticky)      │ │
│ │       _____/\    ___/‾                       │ ┌─────────┬─────────┐     │ │
│ │  ____/       \__/   (area chart)             │ │  BUY ✓  │  SELL   │     │ │
│ │ /                                            │ ├─────────┴─────────┤     │ │
│ ├──────────────────────────────────────────────┤ │ MARKET ✓ │ LIMIT  │     │ │
│ │ Open ₹2,595 │ PrevCl ₹2,585 │ 52H │ 52L      │ │ Quantity  [ 1   ] │     │ │
│ │ MCap ₹17.7LCr│ Vol 4.52M │ P/E 24.8│ P/B 2.3 │ │ LTP       ₹2,620  │     │ │
│ ├──────────────────────────────────────────────┤ │ Est. Value ₹2,620 │     │ │
│ │ [Overview|Financials|Peers|AI Analysis]      │ │ [   BUY RELIANCE ]│     │ │
│ │ ┌──────────────────────────────────────────┐ │ │ Mkt hrs 9:15–3:30 │     │ │
│ │ │ AI ANALYSIS — RELIANCE         🧠        │ │ └───────────────────┘     │ │
│ │ │ ▸ Jio Platforms remains key growth…      │ │ ANALYST RATINGS           │ │
│ │ │ ▸ Bull case: New Energy ₹5,000 Cr…       │ │ StrongBuy ▓▓▓▓▓ 12        │ │
│ │ │ AI Verdict: Accumulate < ₹2,500          │ │ Buy       ▓▓▓ 8           │ │
│ │ │ ⚠ Educational only — not SEBI advice     │ │ Hold      ▓▓ 5            │ │
│ │ └──────────────────────────────────────────┘ │ Sell      ▓ 2             │ │
│ └──────────────────────────────────────────────┴───────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Data bindings** — `useQuote` (market:8085 `/market/quotes/{symbol}`, 15 s poll),
`useOhlcv` (`/market/quotes/{symbol}/ohlcv`), `useStockFinancials`
(`/stocks/{symbol}/financials`), `useStockAnalysis` (ai:9001 `/ai/stocks/analyze`),
`useSentiment` (scoring:9002 `/scoring/sentiment/{symbol}`), `usePlaceOrder`
(trade:8083 `POST /orders` + Idempotency-Key).

---

## 3. Portfolio — `/dashboard/portfolio`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Portfolio                                                  [⟳ Rebalance]     │
│ Your current holdings & performance                                          │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐                │
│ │ Total Value  │ Invested     │ Total P&L    │ Return       │                │
│ │ ₹1,25,430.50 │ ₹1,07,109.75 │ +₹18,320.75  │ +17.10%      │                │
│ └──────────────┴──────────────┴──────────────┴──────────────┘                │
│ ┌──────────────────────────────────────────────┬───────────────────────────┐ │
│ │ HOLDINGS (5)                                 │ ◔ ALLOCATION              │ │
│ │ Symbol     Qty AvgBuy  Current  P&L    P&L%  │      ╭────╮               │ │
│ │ RELIANCE   10  ₹2,450  ₹2,620  +₹1,705 +7.0% │     │donut│ IT 42%        │ │
│ │  Reliance Industries          [Buy][Sell]    │      ╰────╯               │ │
│ │ TCS         5  ₹3,800  ₹3,650  -₹750   -4.0% │ ● IT        42%           │ │
│ │ INFY       20  ₹1,500  ₹1,680  +₹3,600 +12%  │ ● Energy    21%           │ │
│ │ HDFC        8  ₹1,600  ₹1,540  -₹480   -3.8% │ ● Banking   17%           │ │
│ │ WIPRO      30  ₹420    ₹495    +₹2,250 +18%  │ ● FMCG       8%           │ │
│ │ (row click → stock detail)                   │ ● Cash      12%           │ │
│ └──────────────────────────────────────────────┴───────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Data bindings** — `usePortfolioAnalytics` (analytics:9003 `/analytics/portfolio`),
`useAllocation` (`/analytics/allocation`). Profit/loss always use `text-profit` /
`text-loss` tokens.

---

## 4. AI Chat (Copilot) — `/dashboard/ai-advisor`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🧠 AI Copilot                                                  [⟲ Clear]     │
│ Your personal AI financial advisor with portfolio context                    │
│ ┌─────────────────────┬─────────────────────┬─────────────────────┐          │
│ │ ▲ Analyze my        │ ⛨ What are my       │ ◎ How much monthly  │ (quick   │
│ │   portfolio perf.   │   biggest risks?    │   for retirement?   │ prompts, │
│ │ ⌂ Explain P/E ratio │ ☼ Undervalued IT    │ ✦ SIP or lumpsum?   │ 1st run) │
│ └─────────────────────┴─────────────────────┴─────────────────────┘          │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ (🤖) Hello! I'm InvestIQ Copilot…                                        │ │
│ │      • Portfolio analysis & rebalancing advice                           │ │
│ │                                                                          │ │
│ │                       What are my biggest portfolio risks?  (👤, right)  │ │
│ │                                                                          │ │
│ │ (🤖) Portfolio Risk Analysis:                                            │ │
│ │      🔴 High Concentration: IT = 42% …                                   │ │
│ │      Risk Score: 6.2/10                                                  │ │
│ │      *Educational only — not SEBI-registered advice*  ← every response   │ │
│ │ (🤖) ● ● ●   (typing indicator while pending)                            │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ [ Ask anything about investing, your portfolio, markets…        ]  [Send ➤]  │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Data bindings** — `useAiChat` (ai:9001 `POST /ai/chat`, tracks
`conversation_id`). Offline fallback generates a canned response so the
experience never dead-ends. Disclaimer always appended (business rule).

---

## 5. Goal Planner — `/dashboard/ai-advisor/goals`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ◎ Goal Planner                                              [+ Add Goal]     │
│ AI-powered life goals with automated investment plans                        │
│ ┌────────────┬────────────┬──────────────────┬────────────┐                  │
│ │ Total: 4   │ On Track: 3│ Monthly: ₹59,100 │ Target: ₹3.8Cr │              │
│ └────────────┴────────────┴──────────────────┴────────────┘                  │
│ ┌─────────────────────────────────┬─────────────────────────────────┐        │
│ │ ◎ Retirement Corpus  [On Track]🗑│ ⌂ Dream Home      [Off Track]🗑 │        │
│ │ 24 yrs to go · 2050             │ 2 yrs to go · 2028              │        │
│ │ ₹1.3L saved   0.4% of ₹3.0Cr    │ ₹3.8L saved   19% of ₹20.0L     │        │
│ │ ▓░░░░░░░░░░░░░░░ (green)        │ ▓▓▓░░░░░░░░░░░░ (yellow)        │        │
│ │ 🧠 AI Recommended SIP ₹12,400/mo│ 🧠 AI SIP ₹28,500/mo            │        │
│ │ [Equity 70%][Debt 25%][Gold 5%] │ [Eq 50%][Debt 45%][Gold 5%]     │        │
│ │ [▲ Start SIP] [📅 Projections]  │ [▲ Start SIP] [📅 Projections]  │        │
│ └─────────────────────────────────┴─────────────────────────────────┘        │
│  …(Emergency Fund, Child's Education cards)                                  │
│ ╔═ MODAL: Add New Goal ════════════════════════════╗                         │
│ ║ Goal Type  [◎][⌂][🎓][⛨][🚗][✈][♥][✦] (grid)     ║                         │
│ ║ Goal Name  [e.g. Buy a house in Hyderabad      ] ║                         │
│ ║ Target ₹ [5000000]   Current ₹ [0]               ║                         │
│ ║ Target Date [2035-01-01]                         ║                         │
│ ║ [Cancel]              [🧠 Generate AI Plan]      ║                         │
│ ╚══════════════════════════════════════════════════╝                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Data bindings** — `useGoals` / `useCreateGoal` / `useDeleteGoal` (user:8082
`/goals` CRUD), `useGoalSimulation` (ai:9001 `POST /ai/goal-planner`). Creates
fall back to optimistic local goals when offline.
