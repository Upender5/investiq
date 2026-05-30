"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { marketApi } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { StockQuote } from "@/types";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

const MOCK_QUOTES: StockQuote[] = [
  {
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd",
    ltp: 2620.5,
    change: 35.5,
    changePercent: 1.37,
    volume: 4520000,
    high: 2640.0,
    low: 2590.0,
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    ltp: 3650.0,
    change: -45.0,
    changePercent: -1.22,
    volume: 1230000,
    high: 3710.0,
    low: 3630.0,
  },
  {
    symbol: "INFY",
    name: "Infosys Ltd",
    ltp: 1680.0,
    change: 22.0,
    changePercent: 1.33,
    volume: 3100000,
    high: 1695.0,
    low: 1660.0,
  },
  {
    symbol: "HDFC",
    name: "HDFC Bank Ltd",
    ltp: 1540.0,
    change: -18.5,
    changePercent: -1.19,
    volume: 5600000,
    high: 1565.0,
    low: 1530.0,
  },
  {
    symbol: "WIPRO",
    name: "Wipro Ltd",
    ltp: 495.0,
    change: 8.75,
    changePercent: 1.8,
    volume: 2800000,
    high: 500.0,
    low: 485.0,
  },
  {
    symbol: "BAJFINANCE",
    name: "Bajaj Finance Ltd",
    ltp: 7120.0,
    change: 120.0,
    changePercent: 1.71,
    volume: 980000,
    high: 7180.0,
    low: 7050.0,
  },
  {
    symbol: "HCLTECH",
    name: "HCL Technologies Ltd",
    ltp: 1340.0,
    change: -15.0,
    changePercent: -1.11,
    volume: 1540000,
    high: 1360.0,
    low: 1325.0,
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank Ltd",
    ltp: 1125.0,
    change: 12.5,
    changePercent: 1.12,
    volume: 7200000,
    high: 1135.0,
    low: 1110.0,
  },
];

export default function MarketPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: quotes, isLoading } = useQuery<StockQuote[]>({
    queryKey: ["market-quotes", searchTerm],
    queryFn: async () => {
      const url = searchTerm
        ? `/market/search?q=${encodeURIComponent(searchTerm)}`
        : "/market/quotes/top";
      const res = await marketApi.get(url);
      return res.data;
    },
    placeholderData: MOCK_QUOTES,
  });

  const filtered = searchTerm
    ? (quotes ?? []).filter(
        (q) =>
          q.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : quotes ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Market</h2>
        <p className="text-sm text-slate-400">
          Live prices for NSE/BSE listed stocks
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search symbol or company…"
          className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-500">
          <Search className="mb-3 h-10 w-10" />
          <p>No results for &quot;{searchTerm}&quot;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((quote) => {
            const isUp = quote.changePercent >= 0;
            return (
              <Card
                key={quote.symbol}
                className="hover:border-slate-500 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-white">{quote.symbol}</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-tight">
                      {quote.name}
                    </p>
                  </div>
                  <Badge variant={isUp ? "success" : "danger"}>
                    {isUp ? "+" : ""}
                    {quote.changePercent.toFixed(2)}%
                  </Badge>
                </div>

                <div className="mt-4">
                  <p className="text-2xl font-bold text-white">
                    {formatINR(quote.ltp)}
                  </p>
                  <p
                    className={`mt-0.5 text-sm font-medium ${
                      isUp ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {isUp ? "▲" : "▼"} {formatINR(Math.abs(quote.change))}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-700 pt-3">
                  <div>
                    <p className="text-xs text-slate-500">High</p>
                    <p className="text-xs text-green-400">
                      {formatINR(quote.high)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Low</p>
                    <p className="text-xs text-red-400">
                      {formatINR(quote.low)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Vol</p>
                    <p className="text-xs text-slate-300">
                      {(quote.volume / 1_000_000).toFixed(1)}M
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
