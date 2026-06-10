"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, TrendingUp, Star, Filter, Calculator, Plus, Play } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/ui/modal";
import type { MutualFund } from "@/types";

const MOCK_FUNDS: MutualFund[] = [
  { id: "1", name: "Mirae Asset Large Cap Fund", amc: "Mirae Asset", category: "Equity", subCategory: "Large Cap", nav: 98.42, navDate: "2026-06-06", returns1Y: 18.4, returns3Y: 14.2, returns5Y: 16.8, riskRating: "Moderately High", rating: 5, expenseRatio: 0.54, aum: 42800, minSIP: 1000, minLumpsum: 5000, fundManager: "Gaurav Misra", benchmark: "BSE 100" },
  { id: "2", name: "Axis Bluechip Fund", amc: "Axis MF", category: "Equity", subCategory: "Large Cap", nav: 55.18, navDate: "2026-06-06", returns1Y: 15.1, returns3Y: 12.8, returns5Y: 14.5, riskRating: "Moderately High", rating: 4, expenseRatio: 0.72, aum: 35600, minSIP: 500, minLumpsum: 5000, fundManager: "Shreyash Devalkar", benchmark: "NIFTY 100" },
  { id: "3", name: "HDFC Mid Cap Opportunities", amc: "HDFC MF", category: "Equity", subCategory: "Mid Cap", nav: 142.35, navDate: "2026-06-06", returns1Y: 28.7, returns3Y: 21.4, returns5Y: 22.1, riskRating: "High", rating: 5, expenseRatio: 0.98, aum: 62400, minSIP: 500, minLumpsum: 5000, fundManager: "Chirag Setalvad", benchmark: "NIFTY Midcap 150" },
  { id: "4", name: "Quant Small Cap Fund", amc: "Quant MF", category: "Equity", subCategory: "Small Cap", nav: 224.18, navDate: "2026-06-06", returns1Y: 42.1, returns3Y: 38.2, returns5Y: 44.5, riskRating: "Very High", rating: 5, expenseRatio: 0.64, aum: 22100, minSIP: 1000, minLumpsum: 5000, fundManager: "Ankit Pande", benchmark: "NIFTY Smallcap 250" },
  { id: "5", name: "SBI Blue Chip Fund", amc: "SBI MF", category: "Equity", subCategory: "Large Cap", nav: 72.84, navDate: "2026-06-06", returns1Y: 14.2, returns3Y: 11.9, returns5Y: 13.4, riskRating: "Moderately High", rating: 4, expenseRatio: 0.89, aum: 44800, minSIP: 500, minLumpsum: 5000, fundManager: "Rohit Shimpi", benchmark: "BSE 100" },
  { id: "6", name: "ICICI Pru Short Term Fund", amc: "ICICI Prudential", category: "Debt", subCategory: "Short Duration", nav: 48.92, navDate: "2026-06-06", returns1Y: 7.8, returns3Y: 7.1, returns5Y: 7.4, riskRating: "Low", rating: 4, expenseRatio: 0.44, aum: 18200, minSIP: 1000, minLumpsum: 5000, fundManager: "Manish Banthia", benchmark: "CRISIL Short Term" },
  { id: "7", name: "Axis ELSS Tax Saver Fund", amc: "Axis MF", category: "Equity", subCategory: "ELSS", nav: 88.54, navDate: "2026-06-06", returns1Y: 16.8, returns3Y: 13.5, returns5Y: 15.2, riskRating: "High", rating: 4, expenseRatio: 0.68, aum: 34200, minSIP: 500, minLumpsum: 500, fundManager: "Shreyash Devalkar", benchmark: "NIFTY 200" },
  { id: "8", name: "Nippon India Index Fund NIFTY50", amc: "Nippon India", category: "Equity", subCategory: "Index", nav: 32.18, navDate: "2026-06-06", returns1Y: 13.8, returns3Y: 10.9, returns5Y: 12.1, riskRating: "Moderately High", rating: 3, expenseRatio: 0.20, aum: 8900, minSIP: 100, minLumpsum: 500, fundManager: "Managed (Index)", benchmark: "NIFTY 50" },
];

const CATEGORIES = ["All", "Equity", "Debt", "Hybrid", "Gold", "International"];
const RISK_LEVELS = ["All", "Low", "Moderate", "Moderately High", "High", "Very High"];

function riskColor(risk: string) {
  if (risk === "Low") return "success";
  if (risk === "Moderate" || risk === "Moderately High") return "warning";
  if (risk === "High") return "danger";
  return "danger";
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3 w-3 ${i <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/60"}`} />
      ))}
    </div>
  );
}

interface SIPCalcState {
  amount: number;
  years: number;
  rate: number;
}

function SIPCalculatorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [calc, setCalc] = useState<SIPCalcState>({ amount: 5000, years: 10, rate: 12 });
  const months = calc.years * 12;
  const r = calc.rate / 12 / 100;
  const fv = calc.amount * (((Math.pow(1 + r, months) - 1) / r) * (1 + r));
  const invested = calc.amount * months;

  return (
    <Modal open={open} onClose={onClose} title="SIP Calculator" size="md">
      <div className="space-y-4">
        {[
          { label: "Monthly SIP Amount (₹)", key: "amount" as const, min: 100, max: 1000000, step: 100 },
          { label: "Investment Period (Years)", key: "years" as const, min: 1, max: 40, step: 1 },
          { label: "Expected Annual Return (%)", key: "rate" as const, min: 4, max: 30, step: 0.5 },
        ].map(({ label, key, min, max, step }) => (
          <div key={key}>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm text-muted-foreground">{label}</label>
              <span className="text-sm font-semibold text-foreground">
                {key === "amount" ? `₹${calc[key].toLocaleString("en-IN")}` : key === "rate" ? `${calc[key]}%` : `${calc[key]} yrs`}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={calc[key]}
              onChange={(e) => setCalc((p) => ({ ...p, [key]: Number(e.target.value) }))}
              className="w-full accent-violet-500"
            />
          </div>
        ))}

        <div className="rounded-xl bg-card/60 border border-border p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Invested</span>
            <span className="text-foreground font-semibold">₹{invested.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Estimated Returns</span>
            <span className="text-profit font-semibold">₹{Math.round(fv - invested).toLocaleString("en-IN")}</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between">
            <span className="text-foreground/80 font-medium">Future Value</span>
            <span className="text-xl font-bold text-foreground">
              {fv >= 10000000 ? `₹${(fv / 10000000).toFixed(2)} Cr` : `₹${(fv / 100000).toFixed(2)} L`}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground/80">Past performance does not guarantee future returns. This is a projection only.</p>
      </div>
    </Modal>
  );
}

export default function FundsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [risk, setRisk] = useState("All");
  const [showCalc, setShowCalc] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);

  const filtered = MOCK_FUNDS.filter((f) => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.amc.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || f.category === category;
    const matchRisk = risk === "All" || f.riskRating === risk;
    return matchSearch && matchCat && matchRisk;
  });

  function toggleCompare(id: string) {
    setCompareList((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Mutual Funds</h2>
          <p className="text-sm text-muted-foreground">Discover and invest in top-rated mutual funds</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowCalc(true)}>
            <Calculator className="h-4 w-4 mr-1" /> SIP Calculator
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search funds or AMC…"
            className="w-full rounded-lg border border-input bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${category === c ? "bg-primary text-white" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {compareList.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
          <span className="text-sm text-primary">Comparing: {compareList.length}/3 funds</span>
          <Button size="sm" className="bg-primary">Compare Now</Button>
          <button onClick={() => setCompareList([])} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
        </div>
      )}

      {/* Fund Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((fund) => (
          <Card key={fund.id} className="hover:border-muted-foreground/40 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm leading-tight">{fund.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground/80">{fund.amc}</span>
                  <span className="text-muted-foreground/60">·</span>
                  <Badge variant="secondary" className="text-[10px]">{fund.subCategory}</Badge>
                  <Badge variant={riskColor(fund.riskRating) as "success" | "warning" | "danger"} className="text-[10px]">{fund.riskRating}</Badge>
                </div>
                <div className="mt-1"><StarRating rating={fund.rating} /></div>
              </div>
              <div className="text-right ml-3">
                <p className="text-xs text-muted-foreground/80">NAV</p>
                <p className="text-sm font-bold text-foreground">₹{fund.nav.toFixed(2)}</p>
              </div>
            </div>

            {/* Returns */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: "1Y Return", value: fund.returns1Y },
                { label: "3Y Return", value: fund.returns3Y },
                { label: "5Y Return", value: fund.returns5Y },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-secondary/40 px-2 py-2 text-center">
                  <p className={`text-sm font-bold ${value >= 15 ? "text-profit" : value >= 8 ? "text-yellow-400" : "text-foreground/80"}`}>
                    {value.toFixed(1)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground/80">{label}</p>
                </div>
              ))}
            </div>

            {/* Details row */}
            <div className="flex gap-4 text-xs text-muted-foreground/80 mb-4">
              <span>AUM: ₹{(fund.aum / 100).toFixed(0)} Cr</span>
              <span>Expense: {fund.expenseRatio}%</span>
              <span>Min SIP: ₹{fund.minSIP}</span>
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600">
                <Play className="h-3.5 w-3.5 mr-1" /> Start SIP
              </Button>
              <Button size="sm" variant="secondary" className="flex-1">
                <Plus className="h-3.5 w-3.5 mr-1" /> Lumpsum
              </Button>
              <Button
                size="sm"
                variant={compareList.includes(fund.id) ? "primary" : "ghost"}
                onClick={() => toggleCompare(fund.id)}
                className="px-3"
              >
                {compareList.includes(fund.id) ? "✓" : "+"}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <SIPCalculatorModal open={showCalc} onClose={() => setShowCalc(false)} />
    </div>
  );
}
