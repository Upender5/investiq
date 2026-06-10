"use client";

import { useState } from "react";
import {
  Brain, TrendingUp, Shield, Target, Star, Zap,
  ArrowRight, CheckCircle2, AlertTriangle, XCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { PortfolioHealth, RebalanceSuggestion } from "@/types";

const MOCK_HEALTH: PortfolioHealth = {
  overallScore: 68,
  diversificationScore: 52,
  riskReturnScore: 74,
  goalAlignmentScore: 80,
  qualityScore: 71,
  costEfficiencyScore: 88,
  insights: [
    "IT sector concentration is 42% — significantly above recommended 25%. This increases systematic risk.",
    "Portfolio Sharpe ratio of 1.24 is above the benchmark of 1.0 — good risk-adjusted returns.",
    "No exposure to defensive sectors (FMCG, Healthcare, Utilities) — portfolio is cyclical heavy.",
    "TCS and HDFC showing negative P&L — consider reviewing if fundamentals have changed.",
    "Strong momentum in WIPRO (+17.86%) and INFY (+12%) — consider partial profit booking.",
  ],
  actions: [
    { symbol: "TCS", companyName: "Tata Consultancy Services", action: "SELL", quantity: 2, amount: 7300, reason: "IT sector overweight — reduce by 20%", currentWeight: 14.6, targetWeight: 10 },
    { symbol: "INFY", companyName: "Infosys Ltd", action: "SELL", quantity: 5, amount: 8400, reason: "IT sector overweight — take partial profits at +12%", currentWeight: 13.4, targetWeight: 10 },
    { symbol: "HDFCBANK", companyName: "HDFC Bank Ltd", action: "BUY", quantity: 5, amount: 7700, reason: "Banking underweight vs NIFTY weight of 12%", currentWeight: 9.8, targetWeight: 13 },
    { symbol: "NESTLEIND", companyName: "Nestle India Ltd", action: "BUY", quantity: 3, amount: 7200, reason: "Add FMCG exposure — zero defensive holdings", currentWeight: 0, targetWeight: 5 },
  ],
};

const DIMENSIONS = [
  { key: "diversificationScore", label: "Diversification", icon: Shield, description: "Sector spread, correlation, concentration" },
  { key: "riskReturnScore", label: "Risk-Return Efficiency", icon: TrendingUp, description: "Sharpe ratio, volatility vs benchmark" },
  { key: "goalAlignmentScore", label: "Goal Alignment", icon: Target, description: "Holdings match your declared goals & horizon" },
  { key: "qualityScore", label: "Portfolio Quality", icon: Star, description: "Avg ROE, debt levels, earnings consistency" },
  { key: "costEfficiencyScore", label: "Cost Efficiency", icon: Zap, description: "Expense ratios, brokerage, tax drag" },
] as const;

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  const r = 60;
  const cx = 80;
  const cy = 80;
  const circumference = Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={160} height={100} viewBox="0 0 160 100">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#1e293b" strokeWidth={18} strokeLinecap="round" />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={18}
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="white" fontSize={28} fontWeight="bold">{score}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize={11}>/100</text>
      </svg>
      <p className={`text-sm font-semibold ${score >= 80 ? "text-profit" : score >= 60 ? "text-yellow-400" : "text-loss"}`}>
        {score >= 80 ? "Excellent" : score >= 60 ? "Good — Needs Work" : "Needs Improvement"}
      </p>
    </div>
  );
}

function getScoreColor(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function getStatusIcon(score: number) {
  if (score >= 80) return <CheckCircle2 className="h-4 w-4 text-profit" />;
  if (score >= 60) return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
  return <XCircle className="h-4 w-4 text-loss" />;
}

export default function PortfolioHealthPage() {
  const health = MOCK_HEALTH;
  const [executing, setExecuting] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Brain className="h-6 w-6 text-ai" />
            Portfolio Health Score
          </h2>
          <p className="text-sm text-muted-foreground">AI-computed score across 5 portfolio dimensions</p>
        </div>
        <Button variant="secondary" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" /> Recalculate
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Overall Score */}
        <Card className="flex flex-col items-center justify-center py-8 border-ai/20">
          <p className="mb-4 text-sm font-medium text-muted-foreground">Overall Health Score</p>
          <ScoreGauge score={health.overallScore} />
          <div className="mt-4 flex gap-2">
            <Badge variant="warning">Moderate Health</Badge>
            <Badge variant="secondary">Updated now</Badge>
          </div>
        </Card>

        {/* Dimensions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Score Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {DIMENSIONS.map(({ key, label, icon: Icon, description }) => {
                const score = health[key];
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(score)}
                        <div>
                          <p className="text-sm font-medium text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground/80">{description}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${score >= 80 ? "text-profit" : score >= 60 ? "text-yellow-400" : "text-loss"}`}>
                        {score}/100
                      </span>
                    </div>
                    <Progress value={score} color={getScoreColor(score)} size="sm" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Insights */}
      <Card className="border-ai/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-ai" /> AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {health.insights.map((insight, i) => {
            const isWarning = insight.toLowerCase().includes("above") || insight.toLowerCase().includes("no exposure") || insight.toLowerCase().includes("negative");
            return (
              <div key={i} className={`flex gap-3 rounded-lg px-4 py-3 text-sm ${isWarning ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-card/60 border border-border/70"}`}>
                {isWarning ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-profit flex-shrink-0 mt-0.5" />
                )}
                <p className={isWarning ? "text-yellow-200" : "text-foreground/80"}>{insight}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Rebalancing Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Actions</CardTitle>
          <Button
            size="sm"
            loading={executing}
            onClick={() => {
              setExecuting(true);
              setTimeout(() => setExecuting(false), 2000);
            }}
          >
            Execute All <ArrowRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {health.actions.map((action) => (
              <div key={action.symbol} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${action.action === "BUY" ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                <div className="flex items-center gap-3">
                  <Badge variant={action.action === "BUY" ? "success" : "danger"}>{action.action}</Badge>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{action.symbol}</p>
                    <p className="text-xs text-muted-foreground">{action.companyName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {action.quantity} shares · ₹{action.amount.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-muted-foreground/80">{action.reason}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground/80 ml-4">
                  <p>{action.currentWeight.toFixed(1)}% → {action.targetWeight.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground/80">
            Executing all actions will place basket orders worth ₹{health.actions.reduce((s, a) => s + a.amount, 0).toLocaleString("en-IN")}. Review each before proceeding.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
