"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, TrendingUp, TrendingDown, Brain,
  BarChart2, Building2, Users, Calendar,
} from "lucide-react";
import { useQuote, useOhlcv, useStockFinancials, usePlaceOrder, useStockAnalysis, useSentiment } from "@/lib/hooks";
import { formatINR } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StockChart } from "@/components/charts/spark-line";

const fmt = formatINR;
function fmtCr(v: number) {
  return `₹${(v / 1e7).toFixed(2)} Cr`;
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string).toUpperCase();

  const [tab, setTab] = useState("overview");
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [qty, setQty] = useState("1");
  const [limitPrice, setLimitPrice] = useState("");
  const [period, setPeriod] = useState("3M");
  const [orderSuccess, setOrderSuccess] = useState(false);

  // GET /api/v1/market/quotes/{symbol} — polls every 15s
  const { data: quote } = useQuote(symbol);
  // GET /api/v1/market/quotes/{symbol}/ohlcv
  const { data: ohlcData } = useOhlcv(symbol, period, quote?.ltp);
  // GET /api/v1/stocks/{symbol}/financials
  const { data: financials } = useStockFinancials(symbol);
  // POST /api/v1/ai/stocks/analyze (ai-advisor, cached 10 min)
  const { data: aiData } = useStockAnalysis(symbol);
  // GET /api/v1/scoring/sentiment/{symbol} (ml-scoring)
  const { data: sentiment } = useSentiment(symbol);

  // POST /api/v1/orders with Idempotency-Key
  const placeMutation = usePlaceOrder();

  function placeOrder() {
    placeMutation.mutate(
      {
        symbol,
        side: orderSide,
        type: orderType,
        quantity: Number(qty),
        price: orderType === "LIMIT" ? Number(limitPrice) : undefined,
      },
      {
        onSuccess: () => {
          setOrderSuccess(true);
          setTimeout(() => setOrderSuccess(false), 3000);
        },
      }
    );
  }

  const q = quote!;
  const isUp = (q?.changePercent ?? 0) >= 0;
  const aiAnalysis =
    aiData?.paragraphs ??
    aiData?.analysis ??
    ["AI analysis is not available for this stock yet."];
  const quarterly = financials?.quarterly ?? [];
  const sentimentSignal = (sentiment as { signal?: string } | undefined)?.signal;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Markets
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{q?.symbol}</h1>
            <Badge variant="secondary">{q?.sector ?? "Equity"}</Badge>
            <Badge variant="info">NSE</Badge>
            {sentimentSignal && <Badge variant="ai">AI: {sentimentSignal}</Badge>}
          </div>
          <p className="mt-1 text-muted-foreground">{q?.name}</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold font-mono text-foreground">{fmt(q?.ltp ?? 0)}</p>
          <p className={`mt-1 text-lg font-semibold ${isUp ? "text-profit" : "text-loss"}`}>
            {isUp ? <TrendingUp className="inline h-4 w-4 mr-1" /> : <TrendingDown className="inline h-4 w-4 mr-1" />}
            {isUp ? "+" : ""}{fmt(q?.change ?? 0)} ({isUp ? "+" : ""}{(q?.changePercent ?? 0).toFixed(2)}%)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Chart + tabs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart */}
          <Card className="p-0 overflow-hidden">
            <div className="border-b border-border px-6 py-4 flex items-center justify-between">
              <span className="font-semibold text-foreground">Price Chart</span>
              <div className="flex gap-1">
                {["1D", "1W", "1M", "3M", "1Y", "5Y"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${period === p ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-4 pt-2 pb-4">
              <StockChart data={ohlcData ?? []} height={280} />
            </div>
          </Card>

          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Open", value: fmt(q?.open ?? 0) },
              { label: "Prev Close", value: fmt(q?.prevClose ?? 0) },
              { label: "52W High", value: fmt(q?.week52High ?? 0), color: "text-profit" },
              { label: "52W Low", value: fmt(q?.week52Low ?? 0), color: "text-loss" },
              { label: "Market Cap", value: q?.marketCap ? fmtCr(q.marketCap) : "—" },
              { label: "Volume", value: `${((q?.volume ?? 0) / 1_000_000).toFixed(2)}M` },
              { label: "P/E Ratio", value: q?.pe?.toFixed(1) ?? "—" },
              { label: "P/B Ratio", value: q?.pb?.toFixed(2) ?? "—" },
            ].map(({ label, value, color }) => (
              <Card key={label} className="py-3 px-4">
                <p className="text-xs text-muted-foreground/80">{label}</p>
                <p className={`mt-1 text-sm font-semibold ${color ?? "text-foreground"}`}>{value}</p>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {["overview", "financials", "peers", "ai-analysis"].map((t) => (
                <TabsTrigger key={t} value={t} activeValue={tab} onSelect={setTab}>
                  {t === "ai-analysis" ? "AI Analysis" : t.charAt(0).toUpperCase() + t.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" activeValue={tab}>
              <Card>
                <CardHeader><CardTitle>Company Overview</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-4 w-4" /><span>Sector: <span className="text-foreground">{q?.sector ?? "—"}</span></span></div>
                      <div className="flex items-center gap-2 text-muted-foreground"><BarChart2 className="h-4 w-4" /><span>EPS: <span className="text-foreground">{q?.eps?.toFixed(2) ?? "—"}</span></span></div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" /><span>Listed: <span className="text-foreground">NSE, BSE</span></span></div>
                      <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /><span>FY End: <span className="text-foreground">March 31</span></span></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="financials" activeValue={tab}>
              <Card>
                <CardHeader><CardTitle>Quarterly Financials</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {["Period", "Revenue", "PAT", "EPS"].map((h) => (
                            <th key={h} className="pb-3 text-left font-medium text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {quarterly.map((row) => (
                          <tr key={row.period}>
                            <td className="py-3 font-medium text-foreground">{row.period}</td>
                            <td className="py-3 text-foreground/80">{row.revenue}</td>
                            <td className="py-3 text-profit">{row.pat}</td>
                            <td className="py-3 text-foreground/80">{row.eps}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="peers" activeValue={tab}>
              <Card>
                <CardHeader><CardTitle>Peer Comparison</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {["Company", "P/E", "P/B", "ROE %", "ROCE %"].map((h) => (
                            <th key={h} className="pb-3 text-left font-medium text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-muted-foreground">
                            Peer comparison data is not available yet.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-analysis" activeValue={tab}>
              <Card className="border-ai/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-ai" />
                    <span>AI Analysis — {symbol}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiAnalysis.map((para, i) => (
                    <p key={i} className={`text-sm leading-relaxed ${i === aiAnalysis.length - 1 ? "font-semibold text-ai/90" : "text-foreground/80"}`}>
                      {i < aiAnalysis.length - 1 && <span className="text-ai mr-1">▸</span>}
                      {para}
                    </p>
                  ))}
                  <p className="mt-4 rounded-lg bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400 border border-yellow-500/20">
                    Disclaimer: This AI analysis is for educational purposes only and is not SEBI-registered investment advice.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Order Panel */}
        <div className="space-y-4">
          <Card className="sticky top-6">
            <CardHeader><CardTitle>Place Order</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Side toggle */}
              <div className="flex rounded-lg overflow-hidden border border-input">
                {(["BUY", "SELL"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setOrderSide(s)}
                    className={`flex-1 py-2.5 text-sm font-bold transition-colors ${orderSide === s ? (s === "BUY" ? "bg-green-500 text-white" : "bg-red-500 text-white") : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Type */}
              <div className="flex rounded-lg overflow-hidden border border-input">
                {(["MARKET", "LIMIT"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors ${orderType === t ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
                />
              </div>

              {orderType === "LIMIT" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Limit Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.05"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder={String(q?.ltp ?? "")}
                    className="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
                  />
                </div>
              )}

              {/* Order value */}
              <div className="rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>LTP</span>
                  <span className="text-foreground font-mono">{fmt(q?.ltp ?? 0)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground mt-1">
                  <span>Est. Value</span>
                  <span className="text-foreground font-mono font-semibold">
                    {fmt((q?.ltp ?? 0) * Number(qty || 0))}
                  </span>
                </div>
              </div>

              {orderSuccess && (
                <div className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-profit border border-green-500/20">
                  Order placed successfully!
                </div>
              )}

              <Button
                className={`w-full py-3 font-bold ${orderSide === "BUY" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}`}
                loading={placeMutation.isPending}
                onClick={placeOrder}
              >
                {orderSide === "BUY" ? "Buy" : "Sell"} {symbol}
              </Button>

              <p className="text-center text-xs text-muted-foreground/80">
                Market hours: 9:15 AM – 3:30 PM IST
              </p>
            </CardContent>
          </Card>

          {/* Analyst Ratings */}
          <Card>
            <CardHeader><CardTitle className="text-base">Analyst Ratings</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[{ label: "Strong Buy", count: 12, color: "bg-green-500" }, { label: "Buy", count: 8, color: "bg-green-400" }, { label: "Hold", count: 5, color: "bg-yellow-400" }, { label: "Sell", count: 2, color: "bg-red-400" }].map((r) => (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-muted-foreground">{r.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary">
                      <div className={`h-2 rounded-full ${r.color}`} style={{ width: `${(r.count / 27) * 100}%` }} />
                    </div>
                    <span className="w-5 text-xs text-foreground">{r.count}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground/80">27 analysts coverage</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
