"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
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
import type { Holding, PortfolioSummary } from "@/types";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

const MOCK_HOLDINGS: Holding[] = [
  {
    symbol: "RELIANCE",
    companyName: "Reliance Industries Ltd",
    quantity: 10,
    avgBuyPrice: 2450.0,
    currentPrice: 2620.5,
    pnl: 1705.0,
    pnlPercent: 6.96,
  },
  {
    symbol: "TCS",
    companyName: "Tata Consultancy Services",
    quantity: 5,
    avgBuyPrice: 3800.0,
    currentPrice: 3650.0,
    pnl: -750.0,
    pnlPercent: -3.95,
  },
  {
    symbol: "INFY",
    companyName: "Infosys Ltd",
    quantity: 20,
    avgBuyPrice: 1500.0,
    currentPrice: 1680.0,
    pnl: 3600.0,
    pnlPercent: 12.0,
  },
  {
    symbol: "HDFC",
    companyName: "HDFC Bank Ltd",
    quantity: 8,
    avgBuyPrice: 1600.0,
    currentPrice: 1540.0,
    pnl: -480.0,
    pnlPercent: -3.75,
  },
  {
    symbol: "WIPRO",
    companyName: "Wipro Ltd",
    quantity: 30,
    avgBuyPrice: 420.0,
    currentPrice: 495.0,
    pnl: 2250.0,
    pnlPercent: 17.86,
  },
];

const MOCK_SUMMARY: PortfolioSummary = {
  totalValue: 125430.5,
  totalInvested: 107109.75,
  totalPnl: 18320.75,
  totalPnlPercent: 17.1,
  activePositions: 5,
};

export default function PortfolioPage() {
  const { data: holdings, isLoading: holdingsLoading } = useQuery<Holding[]>({
    queryKey: ["portfolio-holdings"],
    queryFn: async () => {
      const res = await analyticsApi.get("/analytics/holdings");
      return res.data;
    },
    placeholderData: MOCK_HOLDINGS,
  });

  const { data: summary } = useQuery<PortfolioSummary>({
    queryKey: ["portfolio-summary"],
    queryFn: async () => {
      const res = await analyticsApi.get("/analytics/portfolio/summary");
      return res.data;
    },
    placeholderData: MOCK_SUMMARY,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Portfolio</h2>
        <p className="text-sm text-slate-400">Your current holdings &amp; performance</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-400">Total Value</p>
          <p className="mt-1 text-xl font-bold text-white">
            {formatINR(summary?.totalValue ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Invested</p>
          <p className="mt-1 text-xl font-bold text-white">
            {formatINR(summary?.totalInvested ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Total P&amp;L</p>
          <p
            className={`mt-1 text-xl font-bold ${
              (summary?.totalPnl ?? 0) >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {formatINR(summary?.totalPnl ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-400">Return</p>
          <p
            className={`mt-1 text-xl font-bold ${
              (summary?.totalPnlPercent ?? 0) >= 0
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {(summary?.totalPnlPercent ?? 0) >= 0 ? "+" : ""}
            {(summary?.totalPnlPercent ?? 0).toFixed(2)}%
          </p>
        </Card>
      </div>

      {/* Holdings table */}
      <Card>
        <CardHeader>
          <CardTitle>Holdings ({holdings?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {holdingsLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Symbol</TableHeader>
                  <TableHeader>Company</TableHeader>
                  <TableHeader className="text-right">Qty</TableHeader>
                  <TableHeader className="text-right">Avg Buy</TableHeader>
                  <TableHeader className="text-right">Current</TableHeader>
                  <TableHeader className="text-right">P&amp;L</TableHeader>
                  <TableHeader className="text-right">P&amp;L %</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(holdings ?? []).map((h) => (
                  <TableRow key={h.symbol}>
                    <TableCell className="font-semibold text-white">
                      {h.symbol}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {h.companyName}
                    </TableCell>
                    <TableCell className="text-right">{h.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatINR(h.avgBuyPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatINR(h.currentPrice)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        h.pnl >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {h.pnl >= 0 ? "+" : ""}
                      {formatINR(h.pnl)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={h.pnlPercent >= 0 ? "success" : "danger"}>
                        {h.pnlPercent >= 0 ? "+" : ""}
                        {h.pnlPercent.toFixed(2)}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="success">
                          Buy
                        </Button>
                        <Button size="sm" variant="danger">
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
    </div>
  );
}
