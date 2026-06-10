"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText, Download, TrendingUp, Receipt, BarChart3,
  Calendar, IndianRupee, ArrowRight,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SparkLine } from "@/components/charts/spark-line";

const PNL_MONTHLY = [
  { date: "2025-07-01", value: 3200 },
  { date: "2025-08-01", value: -1200 },
  { date: "2025-09-01", value: 5400 },
  { date: "2025-10-01", value: 2800 },
  { date: "2025-11-01", value: 8100 },
  { date: "2025-12-01", value: 6400 },
  { date: "2026-01-01", value: -2100 },
  { date: "2026-02-01", value: 9200 },
  { date: "2026-03-01", value: 11400 },
  { date: "2026-04-01", value: 7800 },
  { date: "2026-05-01", value: 13200 },
  { date: "2026-06-01", value: 8900 },
];

const REPORT_CARDS = [
  {
    title: "Capital Gains Report",
    description: "STCG & LTCG breakdown for ITR filing",
    icon: TrendingUp,
    color: "text-profit",
    bg: "bg-green-500/10",
    href: "/dashboard/reports/capital-gains",
    badge: "FY 2025–26",
    badgeVariant: "success" as const,
  },
  {
    title: "Tax P&L Statement",
    description: "Complete profit & loss for tax purposes",
    icon: Receipt,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    href: "/dashboard/reports/tax",
    badge: "ITR Ready",
    badgeVariant: "info" as const,
  },
  {
    title: "Portfolio Performance",
    description: "Annual portfolio performance vs benchmark",
    icon: BarChart3,
    color: "text-ai",
    bg: "bg-ai/10",
    href: "/dashboard/reports/performance",
    badge: "New",
    badgeVariant: "warning" as const,
  },
  {
    title: "Dividend Statement",
    description: "All dividends received across holdings",
    icon: IndianRupee,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    href: "/dashboard/reports/dividends",
    badge: "FY 2025–26",
    badgeVariant: "secondary" as const,
  },
];

const SUMMARY_STATS = [
  { label: "Total Profit (FY26)", value: "₹72,800", sub: "Realized gains", positive: true },
  { label: "Total STCG Tax", value: "₹10,920", sub: "@15% on short-term", positive: false },
  { label: "Total LTCG Tax", value: "₹0", sub: "Under ₹1L exemption", positive: true },
  { label: "Net Returns", value: "+17.1%", sub: "Portfolio CAGR", positive: true },
];

export default function ReportsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  function handleDownload(reportName: string) {
    setDownloading(reportName);
    setTimeout(() => setDownloading(null), 1500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Reports</h2>
        <p className="text-sm text-muted-foreground">Financial statements, tax reports, and portfolio analytics</p>
      </div>

      {/* FY Banner */}
      <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-5 py-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Financial Year 2025–26</p>
            <p className="text-xs text-muted-foreground">April 1, 2025 – March 31, 2026 · Data current as of today</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            loading={downloading === "all"}
            onClick={() => handleDownload("all")}
          >
            <Download className="h-4 w-4 mr-1" /> Download All
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {SUMMARY_STATS.map(({ label, value, sub, positive }) => (
          <Card key={label} className="py-4">
            <p className="text-xs text-muted-foreground/80">{label}</p>
            <p className={`mt-1 text-xl font-bold ${positive ? "text-profit" : "text-loss"}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>
          </Card>
        ))}
      </div>

      {/* P&L Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly P&L Trend (FY26)</CardTitle>
          <Badge variant="info">July 2025 – June 2026</Badge>
        </CardHeader>
        <CardContent>
          <SparkLine data={PNL_MONTHLY} height={120} showAxes={false} />
          <div className="mt-3 flex justify-between text-xs text-muted-foreground/80">
            <span>Jul 2025</span>
            <span className="text-foreground font-medium">Total: ₹72,800 net profit</span>
            <span>Jun 2026</span>
          </div>
        </CardContent>
      </Card>

      {/* Report Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORT_CARDS.map((r) => (
          <Card key={r.title} className="hover:border-muted-foreground/40 transition-colors group">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${r.bg}`}>
                  <r.icon className={`h-5 w-5 ${r.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{r.title}</h3>
                    <Badge variant={r.badgeVariant}>{r.badge}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{r.description}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link href={r.href} className="flex-1">
                <Button variant="secondary" size="sm" className="w-full">
                  View Report <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                loading={downloading === r.title}
                onClick={() => handleDownload(r.title)}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
