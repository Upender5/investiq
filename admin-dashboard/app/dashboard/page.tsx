"use client";

import { useRouter } from "next/navigation";
import {
  TrendingUp, TrendingDown, BarChart3, ArrowLeftRight,
  PlusCircle, MinusCircle, Wallet, Brain, Target,
  Sparkles, AlertTriangle, ChevronRight, Zap,
  Home, GraduationCap, Shield, Heart, Car, Plane,
} from "lucide-react";
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
import type { GoalType, PnlHistory } from "@/types";

const GOAL_ICONS: Record<GoalType, React.ElementType> = {
  RETIREMENT: Target, HOUSE: Home, EDUCATION: GraduationCap, EMERGENCY: Shield,
  CAR: Car, TRAVEL: Plane, MARRIAGE: Heart, CUSTOM: Sparkles,
};

const INSIGHT_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  opportunity: { icon: Sparkles, color: "text-profit", bg: "bg-green-500/10 border-green-500/20" },
  risk: { icon: AlertTriangle, color: "text-warning", bg: "bg-yellow-500/10 border-yellow-500/20" },
  action: { icon: Brain, color: "text-ai", bg: "bg-ai/10 border-ai/20" },
};

function tradeSideBadge(side: string) {
  return side === "BUY" ? <Badge variant="success">BUY</Badge> : <Badge variant="danger">SELL</Badge>;
}

function tradeStatusBadge(status: string) {
  const map: Record<string, "success" | "warning" | "danger" | "secondary"> = {
    EXECUTED: "success", PENDING: "warning", CANCELLED: "secondary", REJECTED: "danger",
  };
  return <Badge variant={map[status] ?? "default"}>{status}</Badge>;
}

export default function DashboardPage() {
  const router = useRouter();

  // Live service data with mock placeholders (renders instantly, hydrates when APIs respond)
  const { data: analytics } = useDashboardAnalytics();
  const { data: recentTrades } = useTradeHistory(5);
  const { data: goals } = useGoals();
  const { data: insights } = useAiRecommendations();
  const { data: health } = usePortfolioHealth();
  const { data: wallet } = useWallet();

  const portfolioValue = analytics?.portfolioValue ?? 0;
  const totalPnl = analytics?.totalPnl ?? 0;
  const totalPnlPercent = analytics?.totalPnlPercent ?? 0;
  const activePositions = analytics?.activePositions ?? 0;
  const todayPnl = analytics?.todayPnl ?? 0;
  const pnlHistory: PnlHistory[] = analytics?.pnlHistory ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Overview</h2>
          <p className="text-sm text-muted-foreground">Welcome back — your portfolio at a glance</p>
        </div>
        <div className="flex gap-2">
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

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="Portfolio Value" value={formatINR(portfolioValue)} icon={BarChart3} iconColor="text-primary" />
        <StatsCard label="Total P&L" value={formatINR(totalPnl)} change={totalPnlPercent} changeLabel="all time" icon={totalPnl >= 0 ? TrendingUp : TrendingDown} iconColor={totalPnl >= 0 ? "text-profit" : "text-loss"} />
        <StatsCard label="Active Positions" value={String(activePositions)} icon={ArrowLeftRight} iconColor="text-warning" />
        <StatsCard label="Wallet Balance" value={formatINR(wallet?.available ?? 0)} icon={Wallet} iconColor="text-muted-foreground" />
      </div>

      {/* AI Insights */}
      <Card className="border-ai/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-ai" /> AI Insights
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/ai-advisor")}>
            Ask Copilot <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {(insights ?? []).map((insight, i) => {
            const style = INSIGHT_STYLES[insight.type] ?? INSIGHT_STYLES.action;
            const Icon = style.icon;
            return (
              <div key={i} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${style.bg}`}>
                <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${style.color}`} />
                <p className="text-foreground/80">{insight.text}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Chart + Quick Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>P&L History</CardTitle>
            <Badge variant="info">FY 2025–26</Badge>
          </CardHeader>
          <CardContent>
            <SparkLine data={pnlHistory} height={180} showAxes={false} />
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground/80">
              <span>{pnlHistory[0] ? formatDate(pnlHistory[0].date) : ""}</span>
              <span className={`font-medium ${totalPnl >= 0 ? "text-profit" : "text-loss"}`}>
                Total: {totalPnl >= 0 ? "+" : ""}{formatINR(totalPnl)}
              </span>
              <span>{pnlHistory.length ? formatDate(pnlHistory[pnlHistory.length - 1].date) : ""}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Unrealised P&L", value: formatINR(totalPnl), positive: totalPnl >= 0 },
              { label: "Return", value: `${totalPnlPercent >= 0 ? "+" : ""}${totalPnlPercent.toFixed(2)}%`, positive: totalPnlPercent >= 0 },
              { label: "Positions", value: String(activePositions), neutral: true },
              { label: "Today's Gain", value: `${todayPnl >= 0 ? "+" : ""}${formatINR(todayPnl)}`, positive: todayPnl >= 0 },
            ].map(({ label, value, positive, neutral }) => (
              <div key={label} className="flex justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={`text-sm font-semibold ${neutral ? "text-foreground" : positive ? "text-profit" : "text-loss"}`}>{value}</span>
              </div>
            ))}
            <div className="border-t border-border pt-3 space-y-2">
              <Button className="w-full" onClick={() => router.push("/dashboard/portfolio")}>View Portfolio</Button>
              <Button variant="ai" className="w-full" onClick={() => router.push("/dashboard/ai-advisor/health")}>
                <Zap className="h-4 w-4 mr-1" /> Portfolio Health: {health?.overallScore ?? "—"}/100
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-ai" /> Goal Progress
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/ai-advisor/goals")}>
            Manage Goals <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(goals ?? []).slice(0, 4).map((goal) => {
              const Icon = GOAL_ICONS[goal.type] ?? Sparkles;
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{goal.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground/80">{formatCompactINR(goal.targetAmount)}</span>
                  </div>
                  <Progress value={goal.progressPercent} color={goal.onTrack ? "bg-green-500" : "bg-yellow-500"} size="md" />
                  <p className="text-xs text-muted-foreground/80">{goal.progressPercent.toFixed(1)}% complete</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/trades")}>View all</Button>
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
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Date</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentTrades.slice(0, 5).map((trade) => (
                  <TableRow key={trade.orderId}>
                    <TableCell className="font-semibold text-foreground">{trade.symbol}</TableCell>
                    <TableCell>{tradeSideBadge(trade.side)}</TableCell>
                    <TableCell>{trade.quantity}</TableCell>
                    <TableCell>{formatINR(trade.price)}</TableCell>
                    <TableCell>{tradeStatusBadge(trade.status)}</TableCell>
                    <TableCell>{formatDate(trade.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center py-12 text-muted-foreground/80">
              <ArrowLeftRight className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No recent trades</p>
              <Button size="sm" className="mt-3" onClick={() => router.push("/dashboard/trades")}>Place First Order</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
