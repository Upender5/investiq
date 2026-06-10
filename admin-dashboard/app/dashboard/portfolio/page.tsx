"use client";

import { useRouter } from "next/navigation";
import { PieChart, RefreshCw } from "lucide-react";
import { usePortfolioAnalytics, useAllocation } from "@/lib/hooks";
import { formatINR, formatPercent } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DonutChart } from "@/components/charts/spark-line";
import { SkeletonRows } from "@/components/ui/skeleton";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/ui/table";

export default function PortfolioPage() {
  const router = useRouter();
  const { data: portfolio, isLoading } = usePortfolioAnalytics();
  const { data: allocation } = useAllocation();

  const summary = portfolio?.summary;
  const holdings = portfolio?.holdings ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Portfolio</h2>
          <p className="text-sm text-muted-foreground">Your current holdings &amp; performance</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/portfolio/rebalance")}>
          <RefreshCw className="h-4 w-4" /> Rebalance
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-muted-foreground">Total Value</p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {formatINR(summary?.totalValue ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Invested</p>
          <p className="mt-1 text-xl font-bold text-foreground">
            {formatINR(summary?.totalInvested ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Total P&amp;L</p>
          <p
            className={`mt-1 text-xl font-bold ${
              (summary?.totalPnl ?? 0) >= 0 ? "text-profit" : "text-loss"
            }`}
          >
            {formatINR(summary?.totalPnl ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Return</p>
          <p
            className={`mt-1 text-xl font-bold ${
              (summary?.totalPnlPercent ?? 0) >= 0 ? "text-profit" : "text-loss"
            }`}
          >
            {formatPercent(summary?.totalPnlPercent ?? 0)}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Holdings table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Holdings ({holdings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <SkeletonRows rows={5} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Symbol</TableHeader>
                    <TableHeader className="text-right">Qty</TableHeader>
                    <TableHeader className="text-right">Avg Buy</TableHeader>
                    <TableHeader className="text-right">Current</TableHeader>
                    <TableHeader className="text-right">P&amp;L</TableHeader>
                    <TableHeader className="text-right">P&amp;L %</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {holdings.map((h) => (
                    <TableRow
                      key={h.symbol}
                      className="cursor-pointer"
                      onClick={() => router.push(`/dashboard/market/stocks/${h.symbol}`)}
                    >
                      <TableCell>
                        <p className="font-semibold text-foreground">{h.symbol}</p>
                        <p className="text-xs text-muted-foreground">{h.companyName}</p>
                      </TableCell>
                      <TableCell className="text-right">{h.quantity}</TableCell>
                      <TableCell className="text-right">{formatINR(h.avgBuyPrice)}</TableCell>
                      <TableCell className="text-right">{formatINR(h.currentPrice)}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          h.pnl >= 0 ? "text-profit" : "text-loss"
                        }`}
                      >
                        {h.pnl >= 0 ? "+" : ""}
                        {formatINR(h.pnl)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={h.pnlPercent >= 0 ? "success" : "danger"}>
                          {formatPercent(h.pnlPercent)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => router.push(`/dashboard/market/stocks/${h.symbol}`)}
                          >
                            Buy
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => router.push(`/dashboard/market/stocks/${h.symbol}`)}
                          >
                            Sell
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Sector allocation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" /> Allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <DonutChart data={allocation ?? []} size={160} />
            <div className="w-full space-y-2">
              {(allocation ?? []).map((slice) => (
                <div key={slice.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="flex-1 text-muted-foreground">{slice.name}</span>
                  <span className="font-semibold text-foreground">{slice.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
