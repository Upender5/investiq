"use client";

import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, BarChart3, ArrowLeftRight,
  PlusCircle, MinusCircle, Wallet, Brain, Target,
  Sparkles, AlertTriangle, ChevronRight, Zap,
  Home, GraduationCap, Shield, Heart, Car, Plane,
  Activity, Users, Clock,
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
import type { GoalType, PnlHistory } from "@/types";

const GOAL_ICONS: Record<GoalType, React.ElementType> = {
  RETIREMENT: Target, HOUSE: Home, EDUCATION: GraduationCap, EMERGENCY: Shield,
  CAR: Car, TRAVEL: Plane, MARRIAGE: Heart, CUSTOM: Sparkles,
};

const INSIGHT_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  opportunity: { icon: Sparkles,      color: "text-profit",       bg: "bg-green-500/10 border-green-500/20" },
  risk:        { icon: AlertTriangle, color: "text-warning",      bg: "bg-yellow-500/10 border-yellow-500/20" },
  action:      { icon: Brain,         color: "text-ai",           bg: "bg-ai/10 border-ai/20" },
};

/* Mock weekly trade volume — replace with analytics hook when available */
const WEEKLY_VOLUME = [
  { day: "Mon", buy: 42, sell: 18 },
  { day: "Tue", buy: 67, sell: 31 },
  { day: "Wed", buy: 55, sell: 44 },
  { day: "Thu", buy: 81, sell: 22 },
  { day: "Fri", buy: 93, sell: 57 },
  { day: "Sat", buy: 28, sell: 12 },
];

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
  const { data: recentTrades } = useTradeHistory(5);
  const { data: goals } = useGoals();
  const { data: insights } = useAiRecommendations();
  const { data: health } = usePortfolioHealth();
  const { data: wallet } = useWallet();

  const portfolioValue    = analytics?.portfolioValue    ?? 0;
  const totalPnl          = analytics?.totalPnl          ?? 0;
  const totalPnlPercent   = analytics?.totalPnlPercent   ?? 0;
  const activePositions   = analytics?.activePositions   ?? 0;
  const todayPnl          = analytics?.todayPnl          ?? 0;
  const pnlHistory: PnlHistory[] = analytics?.pnlHistory ?? [];
  const sparkValues = pnlHistory.map((p) => p.value);

  return (
    <div className="space-y-6 max-w-screen-2xl">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Good morning, Upender 👋</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your portfolio today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="success" onClick={() => router.push("/dashboard/trades")}>
            <PlusCircle className="h-4 w-4" /> Buy
          </Button>
          <Button size="sm" variant="danger" onClick={() => router.push("/dashboard/trades")}>
            <MinusCircle className="h-4 w-4" /> Sell
          </Button>
          <Button size="sm" variant="secondary" onClick={() => router.push("/dashboard/wallet")}>
            <Wallet className="h-4 w-4" /> Add Funds
          </Button>
        </div>
      </div>

      {/* ── KPI Stats Row ── */}
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
          label="Total P&L"
          value={formatINR(totalPnl)}
          change={totalPnlPercent}
          changeLabel="all time"
          icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
          iconColor={totalPnl >= 0 ? "text-profit" : "text-loss"}
          iconBg={totalPnl >= 0 ? "bg-green-500/10" : "bg-red-500/10"}
          sparkData={sparkValues}
        />
        <StatsCard
          label="Today's P&L"
          value={`${todayPnl >= 0 ? "+" : ""}${formatINR(todayPnl)}`}
          icon={Activity}
          iconColor="text-warning"
          iconBg="bg-amber-500/10"
        />
        <StatsCard
          label="Wallet Balance"
          value={formatINR(wallet?.available ?? 0)}
          icon={Wallet}
          iconColor="text-info"
          iconBg="bg-blue-500/10"
        />
      </div>

      {/* ── Main Bento Row: Chart + AI Insights ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* P&L History — 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Portfolio Performance</CardTitle>
              <Badge variant="info">FY 2025–26</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className={twMerge("font-semibold", totalPnl >= 0 ? "text-profit" : "text-loss")}>
                {totalPnl >= 0 ? "+" : ""}{formatINR(totalPnl)}
              </span>
              <span>·</span>
              <span className={totalPnlPercent >= 0 ? "text-profit" : "text-loss"}>
                {totalPnlPercent >= 0 ? "+" : ""}{totalPnlPercent.toFixed(2)}%
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <SparkLine data={pnlHistory} height={200} showAxes />
            <div className="mt-3 flex justify-between text-[11px] text-muted-foreground/60">
              <span>{pnlHistory[0] ? formatDate(pnlHistory[0].date) : "—"}</span>
              <span>{pnlHistory.length ? formatDate(pnlHistory[pnlHistory.length - 1].date) : "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights — 1/3 width */}
        <Card className="border-ai/20 bg-gradient-to-b from-ai/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
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
                <p className="text-xs text-center">AI is analysing your portfolio…</p>
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
                <span className="text-xs font-bold text-profit">{health?.overallScore ?? "—"}/100</span>
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

      {/* ── Secondary Row: Trade Volume + Goals ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Weekly Trade Volume Bar Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Weekly Trade Volume</CardTitle>
            </div>
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
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={WEEKLY_VOLUME} barGap={2} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
                <Bar dataKey="buy" fill="#22c55e" fillOpacity={0.75} radius={[4, 4, 0, 0]} />
                <Bar dataKey="sell" fill="#ef4444" fillOpacity={0.75} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
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
              <div className="flex flex-col items-center py-8 text-muted-foreground/60">
                <Target className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs text-center mb-3">No goals set yet</p>
                <Button size="sm" variant="secondary" onClick={() => router.push("/dashboard/ai-advisor/goals")}>
                  Create a Goal
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {(goals ?? []).slice(0, 4).map((goal) => {
                  const Icon = GOAL_ICONS[goal.type] ?? Sparkles;
                  return (
                    <div key={goal.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{goal.name}</span>
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
                      <Progress
                        value={goal.progressPercent}
                        color={goal.onTrack ? "bg-green-500" : "bg-yellow-500"}
                        size="md"
                      />
                    </div>
                  );
                })}
              </div>
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
          <CardTitle className="flex items-center gap-2">
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
            <div className="flex flex-col items-center py-14 text-muted-foreground/60">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-border">
                <ArrowLeftRight className="h-6 w-6 opacity-40" />
              </div>
              <p className="text-sm font-medium text-foreground/60">No recent trades</p>
              <p className="mt-1 text-xs text-muted-foreground/50">Start investing to see your trade history</p>
              <Button size="sm" className="mt-4" onClick={() => router.push("/dashboard/trades")}>
                Place First Order
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
