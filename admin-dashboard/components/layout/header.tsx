"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, TrendingUp, TrendingDown, LogOut } from "lucide-react";
import { logout } from "@/lib/auth";
import { twMerge } from "tailwind-merge";

interface MarketIndex {
  name: string;
  value: string;
  pct: string;
  positive: boolean;
}

/* Mock NSE indices — replace with live WebSocket data from market-data service */
const INDICES: MarketIndex[] = [
  { name: "NIFTY 50",   value: "24,332.15", pct: "+0.76%", positive: true },
  { name: "SENSEX",     value: "80,248.32", pct: "+0.68%", positive: true },
  { name: "NIFTY BANK", value: "52,148.60", pct: "-0.24%", positive: false },
  { name: "NIFTY IT",   value: "43,621.85", pct: "+0.72%", positive: true },
  { name: "NIFTY MID",  value: "46,890.40", pct: "+1.12%", positive: true },
  { name: "GOLD",       value: "₹72,450",   pct: "+0.31%", positive: true },
  /* duplicate set for seamless loop */
  { name: "NIFTY 50",   value: "24,332.15", pct: "+0.76%", positive: true },
  { name: "SENSEX",     value: "80,248.32", pct: "+0.68%", positive: true },
  { name: "NIFTY BANK", value: "52,148.60", pct: "-0.24%", positive: false },
  { name: "NIFTY IT",   value: "43,621.85", pct: "+0.72%", positive: true },
  { name: "NIFTY MID",  value: "46,890.40", pct: "+1.12%", positive: true },
  { name: "GOLD",       value: "₹72,450",   pct: "+0.31%", positive: true },
];

const PATH_TITLES: Record<string, string> = {
  "/dashboard":                         "Overview",
  "/dashboard/market":                  "Markets · Stocks",
  "/dashboard/funds":                   "Markets · Mutual Funds",
  "/dashboard/ipo":                     "Markets · IPO",
  "/dashboard/portfolio":               "Portfolio · Holdings",
  "/dashboard/portfolio/rebalance":     "Portfolio · Rebalancing",
  "/dashboard/trades":                  "Trades",
  "/dashboard/ai-advisor":              "AI Advisor · Copilot",
  "/dashboard/ai-advisor/health":       "AI Advisor · Portfolio Health",
  "/dashboard/ai-advisor/goals":        "AI Advisor · Goal Planner",
  "/dashboard/ai-advisor/screener":     "AI Advisor · Screener",
  "/dashboard/wallet":                  "Wallet",
  "/dashboard/reports":                 "Reports · Overview",
  "/dashboard/reports/capital-gains":   "Reports · Capital Gains",
  "/dashboard/learn":                   "Learn",
  "/dashboard/community":               "Community",
  "/dashboard/notifications":           "Notifications",
  "/dashboard/profile":                 "Profile",
};

function getTitle(pathname: string) {
  const entry = PATH_TITLES[pathname] ?? "InvestIQ";
  const [primary, secondary] = entry.split(" · ");
  return { primary, secondary };
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { primary, secondary } = getTitle(pathname);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-border bg-background/95 backdrop-blur-md">
      {/* ── Market Ticker Strip ── */}
      <div className="flex items-center gap-3 overflow-hidden border-b border-border/40 bg-muted/20 px-4 py-1.5">
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-live" />
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/50 select-none">
            NSE Live
          </span>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="flex animate-ticker items-center gap-8 whitespace-nowrap">
            {INDICES.map((idx, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-foreground/80">{idx.name}</span>
                <span className="font-mono font-medium text-foreground/90">{idx.value}</span>
                <span className={twMerge(
                  "flex items-center gap-0.5 font-semibold",
                  idx.positive ? "text-profit" : "text-loss"
                )}>
                  {idx.positive
                    ? <TrendingUp className="h-2.5 w-2.5" />
                    : <TrendingDown className="h-2.5 w-2.5" />
                  }
                  {idx.pct}
                </span>
              </div>
            ))}
          </div>
        </div>
        <span className="flex-shrink-0 text-[10px] font-medium text-muted-foreground/40 select-none">
          IST
        </span>
      </div>

      {/* ── Main Header Row ── */}
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        {/* Page title */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg font-bold text-foreground truncate">{primary}</h1>
            {secondary && (
              <span className="hidden sm:block text-sm text-muted-foreground font-normal">
                {secondary}
              </span>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Search */}
          <button className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground hover:border-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring">
            <Search className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="hidden lg:inline text-xs">Search…</span>
            <kbd className="hidden lg:inline rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono text-muted-foreground/50">
              ⌘K
            </kbd>
          </button>

          {/* Notifications */}
          <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white shadow-sm">
              3
            </span>
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-2.5 py-1.5">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-[10px] font-bold text-white">
              U
            </div>
            <span className="hidden md:inline text-xs font-semibold text-foreground">
              Upender
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            aria-label="Logout"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground transition-all duration-150 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
