"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowLeftRight,
  PlusCircle,
  MinusCircle,
  Wallet,
} from "lucide-react";
import { analyticsApi, tradeApi } from "@/lib/api";
import { StatsCard } from "@/components/dashboard/stats-card";
import { PortfolioChart } from "@/components/dashboard/portfolio-chart";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/ui/table";
import type { Trade, PnlHistory } from "@/types";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

// Mock P&L history for chart (used as fallback)
const MOCK_PNL: PnlHistory[] = [
  { date: "2024-11-01", value: 200 },
  { date: "2024-11-15", value: -150 },
  { date: "2024-12-01", value: 500 },
  { date: "2024-12-15", value: 300 },
  { date: "2025-01-01", value: 800 },
  { date: "2025-01-15", value: 1200 },
  { date: "2025-02-01", value: 950 },
  { date: "2025-02-15", value: 1500 },
];

function tradeSideBadge(side: string) {
  return side === "BUY" ? (
    <Badge variant="success">BUY</Badge>
  ) : (
    <Badge variant="danger">SELL</Badge>
  );
}

function tradeStatusBadge(status: string) {
  const map: Record<string, "success" | "warning" | "danger" | "secondary"> = {
    EXECUTED: "success",
    PENDING: "warning",
    CANCELLED: "secondary",
    REJECTED: "danger",
  };
  return <Badge variant={map[status] ?? "default"}>{status}</Badge>;
}

export default function DashboardPage() {
  const router = useRouter();

  const { data: analytics } = useQuery({
    queryKey: ["dashboard-analytics"],
    queryFn: async () => {
      const res = await analyticsApi.get("/analytics/dashboard");
      return res.data;
    },
    // Return mock data on error so UI always renders
    placeholderData: {
      portfolioValue: 125430.5,
      totalPnl: 18320.75,
      totalPnlPercent: 17.1,
      activePositions: 12,
      pnlHistory: MOCK_PNL,
    },
  });

  const { data: recentTrades } = useQuery<Trade[]>({
    queryKey: ["recent-trades"],
    queryFn: async () => {
      const res = await tradeApi.get("/trades?size=5&sort=createdAt,desc");
      return res.data?.content ?? res.data;
    },
    placeholderData: [],
  });

  const portfolioValue = analytics?.portfolioValue ?? 0;
  const totalPnl = analytics?.totalPnl ?? 0;
  const totalPnlPercent = analytics?.totalPnlPercent ?? 0;
  const activePositions = analytics?.activePositions ?? 0;
  const pnlHistory: PnlHistory[] = analytics?.pnlHistory ?? MOCK_PNL;

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Overview</h2>
          <p className="text-sm text-slate-400">
            Welcome back — here&apos;s your portfolio at a glance
          </p>
        </div>
        {/* Quick actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="success"
            onClick={() => router.push("/dashboard/trades")}
          >
            <PlusCircle className="h-4 w-4" /> Buy
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => router.push("/dashboard/trades")}
          >
            <MinusCircle className="h-4 w-4" /> Sell
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push("/dashboard/wallet")}
          >
            <Wallet className="h-4 w-4" /> Add Funds
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Portfolio Value"
          value={formatINR(portfolioValue)}
          icon={BarChart3}
          iconColor="text-indigo-400"
        />
        <StatsCard
          label="Total P&amp;L"
          value={formatINR(totalPnl)}
          change={totalPnlPercent}
          changeLabel="all time"
          icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
          iconColor={totalPnl >= 0 ? "text-green-400" : "text-red-400"}
        />
        <StatsCard
          label="Active Positions"
          value={String(activePositions)}
          icon={ArrowLeftRight}
          iconColor="text-yellow-400"
        />
        <StatsCard
          label="Invested"
          value={formatINR(portfolioValue - totalPnl)}
          icon={Wallet}
          iconColor="text-slate-400"
        />
      </div>

      {/* Chart + recent trades */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* P&L History Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>P&amp;L History</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioChart data={pnlHistory} />
          </CardContent>
        </Card>

        {/* Quick Stats side panel */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Unrealised P&amp;L</span>
              <span
                className={`text-sm font-semibold ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {formatINR(totalPnl)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Return</span>
              <span
                className={`text-sm font-semibold ${totalPnlPercent >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {totalPnlPercent >= 0 ? "+" : ""}
                {totalPnlPercent.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-400">Positions</span>
              <span className="text-sm font-semibold text-white">
                {activePositions}
              </span>
            </div>
            <div className="border-t border-slate-700 pt-4">
              <Button
                className="w-full"
                onClick={() => router.push("/dashboard/portfolio")}
              >
                View Portfolio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/trades")}
          >
            View all
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
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Date</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentTrades.slice(0, 5).map((trade) => (
                  <TableRow key={trade.orderId}>
                    <TableCell className="font-semibold text-white">
                      {trade.symbol}
                    </TableCell>
                    <TableCell>{tradeSideBadge(trade.side)}</TableCell>
                    <TableCell>{trade.quantity}</TableCell>
                    <TableCell>{formatINR(trade.price)}</TableCell>
                    <TableCell>{tradeStatusBadge(trade.status)}</TableCell>
                    <TableCell>
                      {new Date(trade.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">
              No recent trades found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
