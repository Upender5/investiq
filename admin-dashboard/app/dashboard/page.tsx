"use client";

import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, BarChart3, ArrowLeftRight,
  PlusCircle, Wallet, Brain, Target,
  Sparkles, AlertTriangle, ChevronRight, Zap,
  Home, GraduationCap, Shield, Heart, Car, Plane,
  Activity, Sprout, Trophy, Flame, Leaf,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  useDashboardAnalytics,
  useTradeHistory,
  useGoals,
  useAiRecommendations,
  usePortfolioHealth,
  useWallet,
  useProfile,
} from "@/lib/hooks";
import { formatINR, formatCompactINR, formatDate } from "@/lib/format";
import { StatsCard } from "@/components/dashboard/stats-card";
import { SparkLine } from "@/components/charts/spark-line";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableHead, TableBody, TableRow, TableHeader, TableCell,
} from "@/components/ui/table";
import { twMerge } from "tailwind-merge";
import type { GoalType, PnlHistory, Trade } from "@/types";

const GOAL_ICONS: Record<GoalType, React.ElementType> = {
  RETIREMENT: Target, HOUSE: Home, EDUCATION: GraduationCap, EMERGENCY: Shield,
  CAR: Car, TRAVEL: Plane, MARRIAGE: Heart, CUSTOM: Sparkles,
};

const INSIGHT_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  opportunity: { icon: Sparkles,      color: "text-profit",       bg: "bg-green-500/10 border-green-500/20" },
  risk:        { icon: AlertTriangle, color: "text-warning",      bg: "bg-yellow-500/10 border-yellow-500/20" },
  action:      { icon: Brain,         color: "text-ai",           bg: "bg-ai/10 border-ai/20" },
};

/* ── Gamification Level System ──
 * UX Research Doc 10 — Section 4.3:
 * Seedling → Sprout → Sapling → Explorer → Saver → Investor → Wealth Builder
 */
const LEVELS = [
  { name: "Seedling",       icon: Leaf,   min: 0,      color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { name: "Sprout",         icon: Sprout, min: 100,    color: "text-green-400",   bg: "bg-green-500/10" },
  { name: "Sapling",        icon: Sprout, min: 500,    color: "text-teal-400",    bg: "bg-teal-500/10" },
  { name: "Explorer",       icon: Zap,    min: 2000,   color: "text-cyan-400",    bg: "bg-cyan-500/10" },
  { name: "Saver",          icon: Trophy, min: 10000,  color: "text-blue-400",    bg: "bg-blue-500/10" },
  { name: "Investor",       icon: TrendingUp, min: 50000, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  { name: "Wealth Builder", icon: Target, min: 100000, color: "text-violet-400",  bg: "bg-violet-500/10" },
];

function getLevel(totalSaved: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalSaved >= LEVELS[i].min) return { ...LEVELS[i], next: LEVELS[i + 1] ?? null };
  }
  return { ...LEVELS[0], next: LEVELS[1] ?? null };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Aggregate real trade history into per-weekday BUY/SELL counts for the volume chart. */
function buildWeeklyVolume(trades: Trade[]): { day: string; buy: number; sell: number }[] {
  const base = WEEKDAYS.map((day) => ({ day, buy: 0, sell: 0 }));
  for (const t of trades) {
    const d = new Date(t.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const bucket = base[d.getDay()];
    if (t.side === "BUY") bucket.buy += 1;
    else if (t.side === "SELL") bucket.sell += 1;
  }
  // Mon→Sat ordering (drop Sunday-first index)
  return [...base.slice(1), base[0]].slice(0, 6);
}

function tradeSideBadge(side: string) {
  return side === "BUY"
    ? <Badge variant="success">BUY</Badge>
    : <Badge variant="danger">SELL</Badge>;
}

function tradeStatusBadge(status: string) {
  const map: Record<string, "success" | "warning" | "danger" | "secondary"> = {
    EXECUTED: "success", PENDING: "warning", CANCELLED: "secondary", REJECTED: "danger",
  };
  return <Badge variant={map[status] ?? "default"}>{status}</Badge>;
}

/* Goal milestone check — UX Research: celebrate at 25/50/75/100% */
function getMilestone(pct: number): string | null {
  if (pct >= 100) return "complete";
  if (pct >= 75) return "75";
  if (pct >= 50) return "50";
  if (pct >= 25) return "25";
  return null;
}

/* Custom tooltip for the bar chart */
function VolumeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-profit">Buy: {payload[0]?.value} orders</p>
      <p className="text-loss">Sell: {payload[1]?.value} orders</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const { data: analytics } = useDashboardAnalytics();
  const { data: recentTrades } = useTradeHistory(50);
  const { data: goals } = useGoals();
  const { data: insights } = useAiRecommendations();
  const { data: health } = usePortfolioHealth();
  const { data: wallet } = useWallet();
  const { data: profile } = useProfile();
  const firstName = profile?.name?.split(" ")[0];

  const portfolioValue    = analytics?.portfolioValue    ?? 0;
  const totalPnl          = analytics?.totalPnl          ?? 0;
  const totalPnlPercent   = analytics?.totalPnlPercent   ?? 0;
  const activePositions   = analytics?.activePositions   ?? 0;
  const todayPnl          = analytics?.todayPnl          ?? 0;
  const pnlHistory: PnlHistory[] = analytics?.pnlHistory ?? [];
  const sparkValues = pnlHistory.map((p) => p.value);
  const weeklyVolume = buildWeeklyVolume(recentTrades ?? []);
  const hasVolume = weeklyVolume.some((d) => d.buy > 0 || d.sell > 0);

  /* Gamification state */
  const totalSaved = goals?.reduce((sum, g) => sum + (g.currentAmount ?? 0), 0) ?? 0;
  const level = getLevel(totalSaved);
  const LevelIcon = level.icon;
  const streakDays = analytics?.savingsStreakDays ?? 0;
  const coins = profile?.coins ?? 0;

  return (
    <div className="space-y-6 max-w-screen-2xl">

      {/* ── Page Header ──
       * UX Research: Calm, friendly greeting. Goals-first framing.
       * "Good morning, [Name] — here's your progress today."
       */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-editorial">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Every forest starts with one seed. Keep growing.
          </p>
        </div>
        {/* UX: Reframe from trading to goals — "Invest" not "Buy", "Add Funds" not "Add Money" */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="success" onClick={() => router.push("/dashboard/ai-advisor/goals")}>
            <Target className="h-4 w-4 mr-1" /> Add to Goal
          </Button>
          <Button size="sm" variant="secondary" onClick={() => router.push("/dashboard/wallet")}>
            <Wallet className="h-4 w-4 mr-1" /> Add Funds
          </Button>
        </div>
      </div>

      {/* ── Gamification Strip ──
       * UX Research Section 4: Level, streak, and coins visible at a glance.
       * Anti-Robinhood: progress and learning over trading stats.
       */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Level */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 card-hover">
          <div className={twMerge("flex h-10 w-10 items-center justify-center rounded-xl", level.bg)}>
            <LevelIcon className={twMerge("h-5 w-5", level.color)} />
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60">Level</p>
            <p className={twMerge("text-sm font-bold", level.color)}>{level.name}</p>
            {level.next && (
              <p className="text-[10px] text-muted-foreground/50">
                Next: {level.next.name} at {formatCompactINR(level.next.min)}
              </p>
            )}
          </div>
        </div>
        {/* Streak */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 card-hover">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
            <Flame className={twMerge("h-5 w-5", streakDays > 0 ? "text-orange-400" : "text-muted-foreground/30")} />
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60">Savings Streak</p>
            <p className="text-sm font-bold text-foreground">
              {streakDays > 0 ? `${streakDays} day${streakDays > 1 ? "s" : ""}` : "Start today"}
            </p>
            {streakDays > 0 && (
              <p className="text-[10px] text-orange-400/70">Keep it going!</p>
            )}
          </div>
        </div>
        {/* Coins */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 card-hover">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10">
            <Trophy className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60">Coins Earned</p>
            <p className="text-sm font-bold text-yellow-400">{coins.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground/50">Learn & invest to earn more</p>
          </div>
        </div>
      </div>

      {/* ── KPI Stats Row — Goals-first framing ──
       * UX: Portfolio value is shown, but goals progress is equally prominent.
       * No aggressive profit/loss colours as the primary visual.
       */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Portfolio Value"
          value={formatINR(portfolioValue)}
          icon={BarChart3}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          sparkData={sparkValues}
        />
        <StatsCard
          label="Total Saved Toward Goals"
          value={formatINR(totalSaved)}
          icon={Target}
          iconColor="text-ai"
          iconBg="bg-ai/10"
        />
        <StatsCard
          label="Active Positions"
          value={String(activePositions)}
          icon={Activity}
          iconColor="text-info"
          iconBg="bg-blue-500/10"
        />
        <StatsCard
          label="Wallet Balance"
          value={formatINR(wallet?.available ?? 0)}
          icon={Wallet}
          iconColor="text-coin"
          iconBg="bg-yellow-500/10"
        />
      </div>

      {/* ── Main Bento Row: Chart + AI Insights ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Portfolio Performance — 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="font-editorial">Portfolio Performance</CardTitle>
              <Badge variant="info">FY 2025-26</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className={twMerge("font-semibold", totalPnl >= 0 ? "text-profit" : "text-loss")}>
                {totalPnl >= 0 ? "+" : ""}{formatINR(totalPnl)}
              </span>
              <span>/</span>
              <span className={totalPnlPercent >= 0 ? "text-profit" : "text-loss"}>
                {totalPnlPercent >= 0 ? "+" : ""}{totalPnlPercent.toFixed(2)}%
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <SparkLine data={pnlHistory} height={200} showAxes />
            <div className="mt-3 flex justify-between text-[11px] text-muted-foreground/60">
              <span>{pnlHistory[0] ? formatDate(pnlHistory[0].date) : "-"}</span>
              <span>{pnlHistory.length ? formatDate(pnlHistory[pnlHistory.length - 1].date) : "-"}</span>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights — 1/3 width */}
        <Card className="border-ai/20 bg-gradient-to-b from-ai/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-editorial">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ai/15">
                <Brain className="h-4 w-4 text-ai" />
              </div>
              AI Insights
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/ai-advisor")}
              className="text-ai hover:text-ai/80 text-xs"
            >
              Ask Copilot <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(insights ?? []).length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground/60">
                <Sparkles className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs text-center">AI is analysing your portfolio...</p>
              </div>
            ) : (
              (insights ?? []).slice(0, 4).map((insight, i) => {
                const style = INSIGHT_STYLES[insight.type] ?? INSIGHT_STYLES.action;
                const Icon = style.icon;
                return (
                  <div
                    key={i}
                    className={twMerge(
                      "flex items-start gap-3 rounded-xl border px-3 py-2.5 text-xs",
                      style.bg
                    )}
                  >
                    <Icon className={twMerge("h-3.5 w-3.5 flex-shrink-0 mt-0.5", style.color)} />
                    <p className="text-foreground/80 leading-relaxed">{insight.text}</p>
                  </div>
                );
              })
            )}

            {/* Portfolio Health Score */}
            <div className="mt-3 rounded-xl border border-border bg-secondary/30 px-3 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">Portfolio Health</span>
                <span className="text-xs font-bold text-profit">{health?.overallScore ?? "-"}/100</span>
              </div>
              <Progress
                value={health?.overallScore ?? 0}
                color={
                  (health?.overallScore ?? 0) >= 75
                    ? "bg-green-500"
                    : (health?.overallScore ?? 0) >= 50
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }
                size="md"
              />
              <Button
                variant="ai"
                size="sm"
                className="w-full mt-2.5 text-xs h-8"
                onClick={() => router.push("/dashboard/ai-advisor/health")}
              >
                <Zap className="h-3 w-3 mr-1" /> View Full Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Secondary Row: Goal Progress (elevated) + Trade Volume ──
       * UX: Goals are front-and-center. Trade volume is secondary data.
       */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Goal Progress — UX primary feature */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-editorial">
              <Target className="h-4 w-4 text-ai" />
              Goal Progress
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/ai-advisor/goals")}
              className="text-xs"
            >
              Manage <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {(goals ?? []).length === 0 ? (
              /* UX Research Section 5: Empty state with specific copy */
              <div className="flex flex-col items-center py-10 text-muted-foreground/60">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/50">
                  <Sparkles className="h-8 w-8 opacity-40" />
                </div>
                <p className="text-sm font-semibold text-foreground/70 mb-1">What are you dreaming of?</p>
                <p className="text-xs text-center max-w-[240px] mb-4">
                  A laptop? A trip? An emergency fund? Every goal starts with a first step.
                </p>
                <Button size="sm" variant="secondary" onClick={() => router.push("/dashboard/ai-advisor/goals")}>
                  <Target className="h-3.5 w-3.5 mr-1" /> Create a Goal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {(goals ?? []).slice(0, 4).map((goal) => {
                  const Icon = GOAL_ICONS[goal.type] ?? Sparkles;
                  const milestone = getMilestone(goal.progressPercent);
                  return (
                    <div key={goal.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{goal.name}</span>
                          {milestone && (
                            <Badge variant={milestone === "complete" ? "success" : "info"} className="text-[9px] px-1.5 py-0">
                              {milestone === "complete" ? "Done!" : `${milestone}%`}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground/70">
                            {goal.progressPercent.toFixed(0)}%
                          </span>
                          <span className="text-xs text-muted-foreground/60">
                            {formatCompactINR(goal.targetAmount)}
                          </span>
                        </div>
                      </div>
                      <div className={milestone ? "goal-celebrate rounded-full" : "rounded-full"}>
                        <Progress
                          value={goal.progressPercent}
                          color={goal.onTrack ? "bg-green-500" : "bg-yellow-500"}
                          size="md"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Trade Volume — secondary, calm presentation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-editorial">Weekly Activity</CardTitle>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-profit/70" /> Buy
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-loss/70" /> Sell
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {!hasVolume && (
              /* UX Research empty state */
              <div className="flex flex-col items-center py-8 text-muted-foreground/60">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/50">
                  <Leaf className="h-6 w-6 opacity-40" />
                </div>
                <p className="text-sm font-medium text-foreground/60">No activity this week</p>
                <p className="mt-1 text-xs text-muted-foreground/50 text-center max-w-[220px]">
                  Your first investment plants a seed. Watch it grow over time.
                </p>
              </div>
            )}
            {hasVolume && (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyVolume} barGap={2} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 25% 27% / 0.5)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "hsl(215 20% 65%)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "hsl(215 20% 65%)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<VolumeTooltip />} cursor={{ fill: "hsl(217 33% 17% / 0.5)", radius: 4 }} />
                  <Bar dataKey="buy" fill="hsl(var(--profit))" fillOpacity={0.6} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sell" fill="hsl(var(--loss))" fillOpacity={0.6} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Stats Summary Strip ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Unrealised P&L",  value: formatINR(totalPnl),           colored: totalPnl !== 0,       positive: totalPnl >= 0 },
          { label: "Total Return",    value: `${totalPnlPercent >= 0 ? "+" : ""}${totalPnlPercent.toFixed(2)}%`, colored: true, positive: totalPnlPercent >= 0 },
          { label: "Active Positions",value: String(activePositions),        colored: false,                positive: true },
          { label: "Today's Change",  value: `${todayPnl >= 0 ? "+" : ""}${formatINR(todayPnl)}`, colored: todayPnl !== 0, positive: todayPnl >= 0 },
        ].map(({ label, value, colored, positive }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card px-4 py-3 flex flex-col gap-1"
          >
            <p className="text-xs font-medium text-muted-foreground/70">{label}</p>
            <p className={twMerge(
              "text-lg font-bold font-mono",
              colored
                ? positive ? "text-profit" : "text-loss"
                : "text-foreground"
            )}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Recent Trades ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-editorial">
            <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
            Recent Trades
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/trades")} className="text-xs">
            View all <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {recentTrades && recentTrades.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Symbol</TableHeader>
                  <TableHeader>Side</TableHeader>
                  <TableHeader>Qty</TableHeader>
                  <TableHeader>Price</TableHeader>
                  <TableHeader>Value</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Date</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentTrades.slice(0, 5).map((trade) => (
                  <TableRow
                    key={trade.orderId}
                    className="group hover:bg-accent/50 transition-colors duration-100 cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-[10px] font-bold text-foreground">
                          {trade.symbol.slice(0, 2)}
                        </div>
                        <span className="font-bold text-foreground">{trade.symbol}</span>
                      </div>
                    </TableCell>
                    <TableCell>{tradeSideBadge(trade.side)}</TableCell>
                    <TableCell className="font-mono">{trade.quantity}</TableCell>
                    <TableCell className="font-mono">{formatINR(trade.price)}</TableCell>
                    <TableCell className="font-mono font-semibold">
                      {formatINR(trade.price * trade.quantity)}
                    </TableCell>
                    <TableCell>{tradeStatusBadge(trade.status)}</TableCell>
                    <TableCell className="text-muted-foreground/70 text-xs">
                      {formatDate(trade.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            /* UX Research Section 5: Empty state for no trades */
            <div className="flex flex-col items-center py-14 text-muted-foreground/60">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-border">
                <Sprout className="h-7 w-7 opacity-40" />
              </div>
              <p className="text-sm font-semibold text-foreground/70">Every forest starts with one seed</p>
              <p className="mt-1 text-xs text-muted-foreground/50 text-center max-w-[280px]">
                Plant your first investment today and watch it grow toward your goals.
              </p>
              <Button size="sm" className="mt-4" onClick={() => router.push("/dashboard/trades")}>
                <Sprout className="h-4 w-4 mr-1" /> Place First Order
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
