# InvestIQ Frontend — Component Architecture & Data Layer

Next.js 15 App Router app in `admin-dashboard/` (serves as the InvestIQ web client).
React 18 · TanStack Query 5 · Tailwind (token-based) · Recharts · Axios.

---

## 1. App Router folder structure

```
admin-dashboard/
├── app/
│   ├── layout.tsx                    # Root: theme init script, <Providers>
│   ├── providers.tsx                 # ThemeProvider + QueryClientProvider
│   ├── globals.css                   # Design tokens (light :root / .dark)
│   ├── page.tsx                      # Redirect → /login or /dashboard
│   ├── login/page.tsx                # OTP login (auth-service)
│   └── dashboard/
│       ├── layout.tsx                # Auth guard + Sidebar shell
│       ├── page.tsx                  # ① Dashboard
│       ├── market/
│       │   ├── page.tsx              # Stock explorer
│       │   └── stocks/[symbol]/page.tsx   # ② Stock Detail
│       ├── portfolio/
│       │   ├── page.tsx              # ③ Portfolio
│       │   └── rebalance/page.tsx
│       ├── ai-advisor/
│       │   ├── page.tsx              # ④ AI Chat (Copilot)
│       │   ├── goals/page.tsx        # ⑤ Goal Planner
│       │   ├── health/page.tsx       # Portfolio health
│       │   └── screener/page.tsx
│       ├── trades/  wallet/  funds/  ipo/  learn/
│       ├── community/  notifications/  profile/
│       └── reports/ (+ capital-gains/)
├── components/
│   ├── ui/          # primitive library (shadcn-style, token-based)
│   ├── layout/      # sidebar, header
│   ├── charts/      # spark-line, stock chart, donut
│   └── dashboard/   # stats-card, portfolio-chart
├── lib/
│   ├── api.ts       # axios instance per microservice + unwrap helpers
│   ├── auth.ts      # token storage (localStorage)
│   ├── theme.tsx    # ThemeProvider, useTheme, ThemeToggle
│   ├── utils.ts     # cn() = clsx + tailwind-merge
│   ├── format.ts    # formatINR / formatCompactINR / formatPercent / dates
│   ├── mock-data.ts # placeholderData for instant render + offline fallback
│   └── hooks/       # React Query hooks per backend service (see §3)
└── types/index.ts   # shared domain types
```

## 2. Component tree (core screens)

```
RootLayout
└─ Providers (ThemeProvider → QueryClientProvider)
   └─ DashboardLayout (auth guard)
      ├─ Sidebar (nav groups, ThemeToggle, user chip)
      └─ <page>
         ├─ DashboardPage
         │  ├─ StatsCard ×4 (Card)
         │  ├─ AIInsightsCard (Card + Badge + Button)
         │  ├─ SparkLine (recharts Area)
         │  ├─ QuickStats (Card + Button[variant=ai])
         │  ├─ GoalProgress (Progress ×4)
         │  └─ RecentTrades (Table + Badge)
         ├─ StockDetailPage
         │  ├─ QuoteHeader (Badge incl. AI sentiment)
         │  ├─ StockChart + period selector
         │  ├─ KeyStats (Card ×8)
         │  ├─ Tabs → Overview | Financials | Peers | AI Analysis
         │  └─ OrderPanel (sticky; side/type toggles, usePlaceOrder)
         ├─ PortfolioPage
         │  ├─ SummaryCards ×4
         │  ├─ HoldingsTable (row → stock detail)
         │  └─ AllocationCard (DonutChart + legend)
         ├─ AICopilotPage
         │  ├─ QuickPrompts (first run only)
         │  ├─ MessageList (avatars, bubbles, typing dots)
         │  └─ ChatInput (Button[variant=ai])
         └─ GoalPlannerPage
            ├─ SummaryBar ×4
            ├─ GoalCard[] (Progress, AI SIP chip, allocation chips)
            └─ AddGoalModal (type grid, inputs, useCreateGoal)
```

## 3. Data layer — `lib/hooks/`

One file per microservice; every hook unwraps the `ApiResponse<T>` envelope
(`unwrap`/`unwrapPage` in `lib/api.ts`) and ships `placeholderData` from
`lib/mock-data.ts` so screens render instantly and degrade gracefully offline.

| Hook file | Service : port | Key hooks |
|---|---|---|
| use-analytics | analytics : 9003 | useDashboardAnalytics, usePortfolioAnalytics, useAllocation, usePnlHistory, usePerformance, useCapitalGains |
| use-market | market-data : 8085 | useQuote (15 s poll), useOhlcv, useStocks, useTopGainers/Losers, useStockFinancials, useFundamentals, useWatchlists ± mutations |
| use-trades | trade : 8083 | useOrders, useTradeHistory, usePositions, useMargins, usePlaceOrder*, useCancelOrder |
| use-wallet | wallet : 8084 | useWallet, useWalletTransactions, useDeposit*, useWithdraw* |
| use-goals | user : 8082 + ai : 9001 | useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useGoalAiPlan, useGoalSimulation |
| use-funds | fund : 8087 | useMutualFunds, useFundDetail, useSips, useCreateSip*, useInvestLumpsum* |
| use-ai | ai-advisor : 9001 | useAiChat, useConversations, useAiRecommendations, useStockAnalysis, usePortfolioReview |
| use-scoring | ml-scoring : 9002 | useRiskScore, useSentiment, usePortfolioHealth |
| use-notifications | notification : 8086 | useNotifications, useUnreadCount, useMarkRead/AllRead |
| use-user | user : 8082 | useProfile, useKycStatus, useRiskProfile |

`*` = financial mutation → sends `Idempotency-Key: crypto.randomUUID()` (platform rule).

Base URLs come from `NEXT_PUBLIC_*_URL` env vars (default `localhost:<port>`);
a 401 anywhere clears tokens and redirects to `/login`.

## 4. Design tokens & theming

Defined in `app/globals.css` as HSL channels (so Tailwind `/opacity` works),
mapped in `tailwind.config.ts`. Light = `:root`, dark = `.dark` (default;
toggle persisted in `localStorage["investiq-theme"]`, applied pre-paint by
`THEME_INIT_SCRIPT` to avoid flash).

| Token | Use |
|---|---|
| `background / foreground` | page surface & text |
| `card / popover` | raised surfaces |
| `muted / muted-foreground` | subdued surfaces & secondary text |
| `secondary / accent` | chips, hover surfaces |
| `border / input / ring` | lines & focus |
| `primary` | brand (indigo) — CTAs, active nav |
| `ai` | violet — every AI-powered surface (chips, chat, buttons) |
| `profit / loss` | money movement (never reuse success/destructive) |
| `success / warning / info / destructive` | status semantics |

Conventions:
- Money up/down **always** `text-profit` / `text-loss`.
- Anything AI-generated gets the `ai` token family + the SEBI disclaimer.
- White text on solid colored fills stays `text-white` (theme-independent).
- Component primitives (`components/ui/*`) are the only place raw palette
  colors are allowed (e.g. `bg-green-500` for solid Buy buttons).

Known gap: Recharts internals (`components/charts/spark-line.tsx` grid/tooltip
hex colors) are still dark-tuned — acceptable in light mode, candidate for a
follow-up using a `useTheme()`-driven palette.

## 5. UI primitive library (`components/ui/`)

Button (primary/secondary/outline/danger/ghost/success/ai · sm/md/lg/icon ·
loading) · Badge (default/success/danger/warning/info/secondary/ai) · Card
(+Header/Title/Content) · Input · Textarea · Select · Switch · Modal · Tabs ·
Table · Progress · Skeleton (+SkeletonRows) · Avatar.

All primitives use `cn()` and semantic tokens only — they are light/dark safe
by construction.
