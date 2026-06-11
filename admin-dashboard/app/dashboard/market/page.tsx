"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react";
import { useStocks } from "@/lib/hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

const SECTORS = ["All", "IT", "Banking", "Energy", "NBFC", "FMCG", "Auto", "Conglomerate"];

export default function MarketPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [sector, setSector] = useState("All");
  const [tab, setTab] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "change" | "volume">("change");

  // Live instrument list from market-data-service (GET /stocks).
  const { data: stocks, isLoading } = useStocks();
  const quotes = stocks ?? [];

  let filtered = quotes.filter((q) => {
    const matchSearch = !searchTerm || q.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || q.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSector = sector === "All" || q.sector === sector;
    const matchTab = tab === "all" ? true : tab === "gainers" ? q.changePercent > 0 : q.changePercent < 0;
    return matchSearch && matchSector && matchTab;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "change") return Math.abs(b.changePercent) - Math.abs(a.changePercent);
    if (sortBy === "volume") return b.volume - a.volume;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Market</h2>
        <p className="text-sm text-muted-foreground">Live NSE/BSE prices · Click any stock for details and trading</p>
      </div>

      {/* Tabs + Search + Filters */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all" activeValue={tab} onSelect={setTab}>All</TabsTrigger>
              <TabsTrigger value="gainers" activeValue={tab} onSelect={setTab}>
                <TrendingUp className="h-3.5 w-3.5 mr-1 text-profit" /> Gainers
              </TabsTrigger>
              <TabsTrigger value="losers" activeValue={tab} onSelect={setTab}>
                <TrendingDown className="h-3.5 w-3.5 mr-1 text-loss" /> Losers
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search symbol or company…"
              className="w-full rounded-lg border border-input bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortBy(sortBy === "change" ? "volume" : "change")}
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Sort: {sortBy === "change" ? "Change %" : "Volume"}
          </Button>
        </div>

        {/* Sector filter */}
        <div className="flex gap-1 flex-wrap">
          {SECTORS.map((s) => (
            <button
              key={s}
              onClick={() => setSector(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${sector === s ? "bg-primary text-white" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-input border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground/80">
          <Search className="mb-3 h-10 w-10 opacity-30" />
          <p>No stocks available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((quote) => {
            const isUp = quote.changePercent >= 0;
            return (
              <Card
                key={quote.symbol}
                className="hover:border-primary/50 transition-all cursor-pointer active:scale-[0.98]"
                onClick={() => router.push(`/dashboard/market/stocks/${quote.symbol}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-foreground">{quote.symbol}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-1">{quote.name}</p>
                    {quote.sector && (
                      <span className="text-[10px] text-muted-foreground/60 mt-0.5">{quote.sector}</span>
                    )}
                  </div>
                  <Badge variant={isUp ? "success" : "danger"}>
                    {isUp ? "+" : ""}{quote.changePercent.toFixed(2)}%
                  </Badge>
                </div>

                <div className="mb-3">
                  <p className="text-2xl font-bold font-mono text-foreground">{formatINR(quote.ltp)}</p>
                  <p className={`mt-0.5 text-sm font-medium ${isUp ? "text-profit" : "text-loss"}`}>
                    {isUp ? "▲" : "▼"} {formatINR(Math.abs(quote.change))}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground/80">High</p>
                    <p className="text-xs text-profit font-mono">{formatINR(quote.high)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground/80">Low</p>
                    <p className="text-xs text-loss font-mono">{formatINR(quote.low)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground/80">Vol</p>
                    <p className="text-xs text-foreground/80">{(quote.volume / 1_000_000).toFixed(1)}M</p>
                  </div>
                </div>

                {quote.pe && (
                  <div className="mt-2 pt-2 border-t border-border/70">
                    <p className="text-[10px] text-muted-foreground/80">P/E: <span className="text-muted-foreground">{quote.pe?.toFixed(1)}x</span></p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
