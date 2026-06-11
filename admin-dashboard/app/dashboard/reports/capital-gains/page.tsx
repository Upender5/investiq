"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Info, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCapitalGains } from "@/lib/hooks";
import type { CapitalGain } from "@/types";

function fmt(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

function holdingPeriod(purchaseDate: string, saleDate: string) {
  const days = Math.round((new Date(saleDate).getTime() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24));
  if (days >= 365) return `${Math.floor(days / 365)}y ${days % 365}d`;
  return `${days}d`;
}

export default function CapitalGainsPage() {
  const [tab, setTab] = useState("all");

  // analytics-service: GET /analytics/reports/capital-gains
  const { data, isLoading } = useCapitalGains();
  const gains = (data as CapitalGain[] | undefined) ?? [];

  const stcg = gains.filter((g) => g.gainType === "STCG");
  const ltcg = gains.filter((g) => g.gainType === "LTCG");
  const filtered = tab === "stcg" ? stcg : tab === "ltcg" ? ltcg : gains;

  const totalSTCG = stcg.reduce((s, g) => s + g.gain, 0);
  const totalLTCG = ltcg.reduce((s, g) => s + g.gain, 0);
  const totalGain = totalSTCG + totalLTCG;
  const stcgTax = Math.max(0, totalSTCG * 0.15);
  const ltcgTax = Math.max(0, (totalLTCG - 100000) * 0.10);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/reports">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Reports
          </button>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Capital Gains Report</h2>
          <p className="text-sm text-muted-foreground">FY 2025–26 · Schedule CG for ITR filing</p>
        </div>
        <Button size="sm">
          <Download className="h-4 w-4 mr-1" /> Download CSV
        </Button>
      </div>

      {/* Tax Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total STCG", value: fmt(totalSTCG), sub: "Taxable @ 15%", color: totalSTCG >= 0 ? "text-profit" : "text-loss" },
          { label: "STCG Tax Liability", value: fmt(stcgTax), sub: "Payable", color: "text-loss" },
          { label: "Total LTCG", value: fmt(totalLTCG), sub: `₹1L exempt · Taxable: ${fmt(Math.max(0, totalLTCG - 100000))}`, color: "text-profit" },
          { label: "LTCG Tax Liability", value: fmt(ltcgTax), sub: "@10% above ₹1L", color: ltcgTax > 0 ? "text-loss" : "text-profit" },
        ].map(({ label, value, sub, color }) => (
          <Card key={label} className="py-4">
            <p className="text-xs text-muted-foreground/80">{label}</p>
            <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-tight">{sub}</p>
          </Card>
        ))}
      </div>

      {/* LTCG Exemption Banner */}
      {totalLTCG <= 100000 && totalLTCG > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-profit">
          <Info className="h-4 w-4 flex-shrink-0" />
          Your LTCG of {fmt(totalLTCG)} is within the ₹1L annual exemption limit — no LTCG tax payable!
        </div>
      )}

      {/* Total Net Gain */}
      <Card className={totalGain >= 0 ? "border-green-500/20" : "border-red-500/20"}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Net Capital Gain / Loss (FY26)</p>
            <p className={`text-3xl font-bold mt-1 ${totalGain >= 0 ? "text-profit" : "text-loss"}`}>
              {totalGain >= 0 ? "+" : ""}{fmt(totalGain)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Tax Liability</p>
            <p className="text-xl font-semibold text-loss mt-1">{fmt(stcgTax + ltcgTax)}</p>
            <p className="text-xs text-muted-foreground/80">STCG + LTCG combined</p>
          </div>
        </div>
      </Card>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {[
                { value: "all", label: `All (${gains.length})` },
                { value: "stcg", label: `STCG (${stcg.length})` },
                { value: "ltcg", label: `LTCG (${ltcg.length})` },
              ].map(({ value, label }) => (
                <TabsTrigger key={value} value={value} activeValue={tab} onSelect={setTab}>{label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Stock", "Qty", "Buy Date", "Buy Price", "Sell Date", "Sell Price", "Holding", "Gain/Loss", "Type"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                      No capital-gains transactions for this period.
                    </td>
                  </tr>
                )}
                {filtered.map((g, i) => (
                  <tr key={`${g.symbol}-${i}`} className="hover:bg-accent/30">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-foreground">{g.symbol}</p>
                      <p className="text-[10px] text-muted-foreground/80">{g.companyName}</p>
                    </td>
                    <td className="px-3 py-3 text-foreground/80">{g.quantity}</td>
                    <td className="px-3 py-3 text-muted-foreground">{new Date(g.purchaseDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-3 font-mono text-foreground/80">{fmt(g.purchasePrice)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{new Date(g.saleDate).toLocaleDateString("en-IN")}</td>
                    <td className="px-3 py-3 font-mono text-foreground/80">{fmt(g.salePrice)}</td>
                    <td className="px-3 py-3 text-muted-foreground">{holdingPeriod(g.purchaseDate, g.saleDate)}</td>
                    <td className="px-3 py-3">
                      <span className={`font-semibold ${g.gain >= 0 ? "text-profit" : "text-loss"}`}>
                        {g.gain >= 0 ? "+" : ""}{fmt(g.gain)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={g.gainType === "STCG" ? "warning" : "info"}>{g.gainType}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg bg-card/60 border border-border/70 px-4 py-3 text-xs text-muted-foreground">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-yellow-400" />
        <p>STCG applies to equity sold within 12 months (taxed @15%). LTCG applies to equity sold after 12 months (taxed @10% above ₹1L). Rates effective FY26. Please consult a CA for your specific tax situation.</p>
      </div>
    </div>
  );
}
