"use client";

import { useState } from "react";
import { Search, Brain, Sparkles, TrendingUp, Shield, Zap, Star, Filter, Bookmark } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SAMPLE_QUERIES = [
  { text: "Undervalued IT stocks with P/E < 20", icon: TrendingUp, color: "text-blue-400" },
  { text: "Best dividend stocks yielding > 3%", icon: Star, color: "text-yellow-400" },
  { text: "High growth small caps under ₹5000 Cr market cap", icon: Zap, color: "text-orange-400" },
  { text: "Low beta defensive stocks for retirement", icon: Shield, color: "text-profit" },
  { text: "Momentum stocks at 52-week high with volume surge", icon: TrendingUp, color: "text-ai" },
  { text: "Quality large caps with ROE > 20% and low debt", icon: Sparkles, color: "text-pink-400" },
];

interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string;
  ltp: number;
  changePercent: number;
  pe: number;
  pb: number;
  roe: number;
  debtEquity: number;
  divYield: number;
  marketCap: string;
  aiScore: number;
  aiVerdict: string;
}

function getVerdictColor(v: string) {
  if (v === "Strong Buy") return "success";
  if (v === "Buy") return "info";
  if (v === "Hold") return "warning";
  return "danger";
}

export default function AIScreenerPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [savedScreeners, setSavedScreeners] = useState<string[]>([]);

  function runScreener(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(false);
    // The AI screener endpoint is not yet wired — return no fabricated matches.
    setTimeout(() => {
      setResults([]);
      setLoading(false);
      setSearched(true);
    }, 600);
  }

  function saveScreener(q: string) {
    setSavedScreeners((prev) => prev.includes(q) ? prev : [...prev, q]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Brain className="h-6 w-6 text-ai" /> AI Stock Screener
        </h2>
        <p className="text-sm text-muted-foreground">Search stocks using natural language — AI translates to filters instantly</p>
      </div>

      {/* Search */}
      <Card className="border-ai/20">
        <CardContent className="pt-0">
          <div className="relative">
            <Brain className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ai" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runScreener(query)}
              placeholder="e.g. Find high ROE pharma stocks with low debt…"
              className="w-full rounded-xl border border-input bg-card/60 py-3.5 pl-12 pr-32 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
              {searched && (
                <button
                  onClick={() => saveScreener(query)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-ai transition-colors"
                >
                  <Bookmark className="h-3.5 w-3.5" /> Save
                </button>
              )}
              <Button size="sm" className="bg-ai hover:bg-ai/90" loading={loading} onClick={() => runScreener(query)}>
                <Search className="h-4 w-4" /> Screen
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample queries */}
      {!searched && (
        <>
          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Popular Screens</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SAMPLE_QUERIES.map(({ text, icon: Icon, color }) => (
                <button
                  key={text}
                  onClick={() => { setQuery(text); runScreener(text); }}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card/40 px-4 py-3 text-left text-sm text-foreground/80 transition-colors hover:border-ai/40 hover:bg-accent"
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${color}`} />
                  <span className="leading-tight">{text}</span>
                </button>
              ))}
            </div>
          </div>

          {savedScreeners.length > 0 && (
            <div>
              <p className="mb-3 text-sm font-medium text-muted-foreground">Saved Screeners</p>
              <div className="flex flex-wrap gap-2">
                {savedScreeners.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setQuery(s); runScreener(s); }}
                    className="flex items-center gap-1.5 rounded-full border border-ai/30 bg-ai/10 px-3 py-1 text-xs text-ai/90 hover:bg-ai/20 transition-colors"
                  >
                    <Bookmark className="h-3 w-3" /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Loading */}
      {loading && (
        <Card className="border-ai/20">
          <CardContent className="flex flex-col items-center py-12">
            <div className="flex gap-2 mb-4">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="h-2.5 w-2.5 rounded-full bg-ai animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">AI is analyzing 5,000+ stocks…</p>
            <p className="text-xs text-muted-foreground/80 mt-1">Applying filters: {query}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {searched && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found <span className="text-foreground font-semibold">{results.length} stocks</span> matching "{query}"
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost"><Filter className="h-4 w-4 mr-1" /> Refine</Button>
            </div>
          </div>

          {/* AI translated filters */}
          <div className="flex flex-wrap gap-2">
            {["Sector: IT", "P/E < 20", "ROE > 15%", "Market Cap > ₹5K Cr", "Debt/Equity < 0.5"].map((f) => (
              <span key={f} className="rounded-full bg-ai/10 border border-ai/20 px-3 py-1 text-xs text-ai/90">
                {f}
              </span>
            ))}
            <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">AI-generated filters</span>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Stock", "LTP", "Change", "P/E", "P/B", "ROE %", "D/E", "Div Yield", "Mkt Cap", "AI Score", "Verdict"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {results.map((r) => (
                    <tr key={r.symbol} className="hover:bg-accent/40 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{r.symbol}</p>
                        <p className="text-xs text-muted-foreground/80">{r.sector}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-foreground">₹{r.ltp.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3">
                        <span className={r.changePercent >= 0 ? "text-profit" : "text-loss"}>
                          {r.changePercent >= 0 ? "+" : ""}{r.changePercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground/80">{r.pe.toFixed(1)}x</td>
                      <td className="px-4 py-3 text-foreground/80">{r.pb.toFixed(1)}x</td>
                      <td className="px-4 py-3 text-profit">{r.roe.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-foreground/80">{r.debtEquity.toFixed(2)}</td>
                      <td className="px-4 py-3 text-foreground/80">{r.divYield.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.marketCap}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-secondary">
                            <div className={`h-1.5 rounded-full ${r.aiScore >= 80 ? "bg-green-500" : r.aiScore >= 65 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${r.aiScore}%` }} />
                          </div>
                          <span className="text-xs text-foreground">{r.aiScore}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getVerdictColor(r.aiVerdict) as "success" | "info" | "warning" | "danger"}>{r.aiVerdict}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-muted-foreground/80 text-center">
            AI analysis is for educational purposes only. Not SEBI-registered investment advice.
          </p>
        </div>
      )}
    </div>
  );
}
