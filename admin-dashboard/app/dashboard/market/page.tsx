"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, TrendingDown, BarChart2, ArrowUpDown } from "lucide-react";
import { marketApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { StockQuote } from "@/types";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
}

const MOCK_QUOTES: StockQuote[] = [
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", ltp: 2620.5, change: 35.5, changePercent: 1.37, volume: 4520000, high: 2640, low: 2590, sector: "Energy", marketCap: 17750000000000, pe: 24.8 },
  { symbol: "TCS", name: "Tata Consultancy Services", ltp: 3650, change: -45, changePercent: -1.22, volume: 1230000, high: 3710, low: 3630, sector: "IT", marketCap: 13200000000000, pe: 28.1 },
  { symbol: "INFY", name: "Infosys Ltd", ltp: 1680, change: 22, changePercent: 1.33, volume: 3100000, high: 1695, low: 1660, sector: "IT", marketCap: 6980000000000, pe: 23.5 },
  { symbol: "HDFC", name: "HDFC Bank Ltd", ltp: 1540, change: -18.5, changePercent: -1.19, volume: 5600000, high: 1565, low: 1530, sector: "Banking", marketCap: 11550000000000, pe: 19.2 },
  { symbol: "WIPRO", name: "Wipro Ltd", ltp: 495, change: 8.75, changePercent: 1.8, volume: 2800000, high: 500, low: 485, sector: "IT", marketCap: 2600000000000, pe: 18.4 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", ltp: 7120, change: 120, changePercent: 1.71, volume: 980000, high: 7180, low: 7050, sector: "NBFC", marketCap: 4300000000000, pe: 31.2 },
  { symbol: "HCLTECH", name: "HCL Technologies Ltd", ltp: 1340, change: -15, changePercent: -1.11, volume: 1540000, high: 1360, low: 1325, sector: "IT", marketCap: 3630000000000, pe: 22.1 },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", ltp: 1125, change: 12.5, changePercent: 1.12, volume: 7200000, high: 1135, low: 1110, sector: "Banking", marketCap: 7920000000000, pe: 17.8 },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", ltp: 1890, change: -22, changePercent: -1.15, volume: 1890000, high: 1920, low: 1875, sector: "Banking", marketCap: 3760000000000, pe: 20.4 },
  { symbol: "NESTLEIND", name: "Nestle India Ltd", ltp: 2320, change: 18.5, changePercent: 0.8, volume: 220000, high: 2340, low: 2295, sector: "FMCG", marketCap: 2240000000000, pe: 65.8 },
  { symbol: "MARUTI", name: "Maruti Suzuki India", ltp: 12450, change: 185, changePercent: 1.51, volume: 340000, high: 12520, low: 12280, sector: "Auto", marketCap: 3760000000000, pe: 28.4 },
  { symbol: "ADANIENT", name: "Adani Enterprises Ltd", ltp: 2840, change: -62, changePercent: -2.14, volume: 1240000, high: 2910, low: 2820, sector: "Conglomerate", marketCap: 3230000000000, pe: 45.2 },
];

const INDEX_DATA = [
  { name: "NIFTY 50", value: 24580.5, change: 142.3, changePercent: 0.58 },
  { name: "SENSEX", value: 81240.8, change: 468.5, changePercent: 0.58 },
  { name: "NIFTY BANK", value: 53420.2, change: -182.4, changePercent: -0.34 },
  { name: "NIFTY IT", value: 39840.6, change: 284.1, changePercent: 0.72 },
];

const SECTORS = ["All", "IT", "Banking", "Energy", "NBFC", "FMCG", "Auto", "Conglomerate"];

export default function MarketPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [sector, setSector] = useState("All");
  const [tab, setTab] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "change" | "volume">("change");

  const { data: quotes } = useQuery<StockQuote[]>({
    queryKey: ["market-quotes"],
    queryFn: async () => {
      const res = await marketApi.get("/market/quotes/top");
      return res.data;
    },
    placeholderData: MOCK_QUOTES,
  });

  let filtered = (quotes ?? []).filter((q) => {
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

      {/* Index Ticker */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {INDEX_DATA.map((idx) => {
          const isUp = idx.changePercent >= 0;
          return (
            <Card key={idx.name} className="py-3 px-4">
              <p className="text-xs text-muted-foreground/80">{idx.name}</p>
              <p className="text-lg font-bold text-foreground font-mono mt-0.5">{idx.value.toLocaleString("en-IN")}</p>
              <p className={`text-xs font-semibold mt-0.5 flex items-center gap-1 ${isUp ? "text-profit" : "text-loss"}`}>
                {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isUp ? "+" : ""}{idx.changePercent.toFixed(2)}%
              </p>
            </Card>
          );
        })}
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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground/80">
          <Search className="mb-3 h-10 w-10 opacity-30" />
          <p>No results found</p>
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
