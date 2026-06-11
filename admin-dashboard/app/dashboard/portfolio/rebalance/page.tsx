"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Brain, RefreshCw, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, ShoppingCart } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DonutChart } from "@/components/charts/spark-line";
import { useAllocation } from "@/lib/hooks";
import type { RebalanceSuggestion, AllocationSlice } from "@/types";

function fmt(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

export default function RebalancePage() {
  // analytics-service: GET /analytics/allocation provides the live sector split.
  // Target allocation and AI rebalancing suggestions are not yet exposed by a backend.
  const { data: allocData } = useAllocation();
  const currentAllocation = (allocData ?? []) as AllocationSlice[];
  const targetAllocation: AllocationSlice[] = [];
  const suggestions: RebalanceSuggestion[] = [];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [executing, setExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);

  function toggleSuggestion(symbol: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }

  const selectedSuggestions = suggestions.filter((s) => selected.has(s.symbol));
  const totalBuy = selectedSuggestions.filter((s) => s.action === "BUY").reduce((sum, s) => sum + s.amount, 0);
  const totalSell = selectedSuggestions.filter((s) => s.action === "SELL").reduce((sum, s) => sum + s.amount, 0);

  function executeRebalance() {
    setExecuting(true);
    setTimeout(() => {
      setExecuting(false);
      setExecuted(true);
    }, 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/portfolio">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Portfolio
          </button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Brain className="h-6 w-6 text-ai" /> AI Rebalancing
          </h2>
          <p className="text-sm text-muted-foreground">Bring your portfolio back to target allocation with AI-guided trades</p>
        </div>
        <Button variant="secondary" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" /> Recalculate
        </Button>
      </div>

      {executed && (
        <div className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-profit" />
          <div>
            <p className="text-sm font-semibold text-profit">Rebalancing orders placed successfully!</p>
            <p className="text-xs text-muted-foreground">Orders are being processed. Check Trade History for status.</p>
          </div>
        </div>
      )}

      {/* Allocation Comparison */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-400" />Current Allocation</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <DonutChart data={currentAllocation} size={140} />
              <div className="flex-1 space-y-2">
                {currentAllocation.map((s) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-foreground/80">{s.name}</span>
                      </span>
                      <span className={`font-semibold ${s.name === "IT" ? "text-loss" : "text-foreground"}`}>{s.value}%</span>
                    </div>
                    <Progress value={s.value} size="sm" className="mb-1" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-profit" />Target Allocation</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <DonutChart data={targetAllocation} size={140} />
              <div className="flex-1 space-y-2">
                {targetAllocation.map((s) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-foreground/80">{s.name}</span>
                      </span>
                      <span className="font-semibold text-foreground">{s.value}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary/60">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${s.value}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suggestions */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Rebalancing Actions</CardTitle>
            <p className="text-xs text-muted-foreground/80 mt-0.5">Select actions to include in your rebalancing order</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground/80">Net Impact</p>
            <p className={`text-sm font-semibold ${totalSell - totalBuy >= 0 ? "text-profit" : "text-loss"}`}>
              {totalSell > totalBuy ? "+" : ""}{fmt(totalSell - totalBuy)}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center text-muted-foreground/80">
              <Brain className="mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">No rebalancing actions available yet.</p>
            </div>
          )}
          {suggestions.map((s) => (
            <div
              key={s.symbol}
              onClick={() => toggleSuggestion(s.symbol)}
              className={`flex items-center gap-4 rounded-xl border px-4 py-3 cursor-pointer transition-all ${selected.has(s.symbol) ? (s.action === "BUY" ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5") : "border-border/70 bg-transparent opacity-50"}`}
            >
              {/* Checkbox */}
              <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${selected.has(s.symbol) ? "border-primary bg-primary" : "border-input"}`}>
                {selected.has(s.symbol) && <span className="text-foreground text-xs font-bold">✓</span>}
              </div>

              <Badge variant={s.action === "BUY" ? "success" : "danger"}>{s.action}</Badge>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{s.symbol}</p>
                  <p className="text-xs text-muted-foreground">{s.companyName}</p>
                </div>
                <p className="text-xs text-muted-foreground/80 mt-0.5">{s.reason}</p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-foreground">{s.quantity} shares</p>
                <p className="text-xs text-muted-foreground">{fmt(s.amount)}</p>
              </div>

              <div className="text-right text-xs text-muted-foreground/80 flex-shrink-0 hidden sm:block">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground/80">{s.currentWeight.toFixed(1)}%</span>
                  {s.action === "SELL" ? (
                    <TrendingDown className="h-3 w-3 text-loss" />
                  ) : (
                    <TrendingUp className="h-3 w-3 text-profit" />
                  )}
                  <span className="text-foreground">{s.targetWeight.toFixed(1)}%</span>
                </div>
                <p className="text-[10px]">current → target</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Execute */}
      <Card className="border-primary/20">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {selectedSuggestions.length} action{selectedSuggestions.length !== 1 ? "s" : ""} selected
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Buy: <span className="text-profit font-semibold">{fmt(totalBuy)}</span></span>
              <span>Sell: <span className="text-loss font-semibold">{fmt(totalSell)}</span></span>
            </div>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90"
            loading={executing}
            disabled={selectedSuggestions.length === 0 || executed}
            onClick={executeRebalance}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            {executed ? "Orders Placed" : `Execute ${selectedSuggestions.length} Orders`}
          </Button>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground/80">
        Basket orders will be placed at market price during trading hours (9:15 AM – 3:30 PM IST). Orders placed outside market hours will execute at the next open. This rebalancing suggestion is AI-generated and for educational purposes only.
      </p>
    </div>
  );
}
