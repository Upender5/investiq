"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, TrendingUp, TrendingDown, LogOut } from "lucide-react";
import { logout } from "@/lib/auth";
import { useProfile, useTopGainers, useUnreadCount } from "@/lib/hooks";
import { formatINR } from "@/lib/format";
import { twMerge } from "tailwind-merge";

const PATH_TITLES: Record<string, string> = {
  "/dashboard":                         "Overview",
  "/dashboard/market":                  "Markets",
  "/dashboard/funds":                   "Mutual Funds",
  "/dashboard/ipo":                     "IPO",
  "/dashboard/portfolio":               "Holdings",
  "/dashboard/portfolio/rebalance":     "Rebalancing",
  "/dashboard/trades":                  "Trades",
  "/dashboard/ai-advisor":              "AI Advisor",
  "/dashboard/ai-advisor/health":       "Portfolio Health",
  "/dashboard/ai-advisor/goals":        "Goal Planner",
  "/dashboard/ai-advisor/screener":     "Screener",
  "/dashboard/wallet":                  "Wallet",
  "/dashboard/reports":                 "Reports",
  "/dashboard/reports/capital-gains":   "Capital Gains",
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

  const { data: profile } = useProfile();
  const { data: movers } = useTopGainers();
  const { data: unread } = useUnreadCount();

  // Calm market strip: subtle, no-flash summary of market activity.
  // UX Research: "No flashing prices or green/red ticker animations"
  const tickerSource = movers ?? [];
  const ticker = [...tickerSource, ...tickerSource];

  const displayName = profile?.name ?? "";
  const initial = displayName?.[0]?.toUpperCase() ?? "?";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-border bg-background/95 backdrop-blur-md">
      {/* ── Calm Market Strip ──
       * UX Research v1.0: "No flashing prices, no Top Movers list"
       * Shows a gentle scrolling summary instead of aggressive ticker.
       * Green dot is subtle (no blink animation), labels are neutral.
       */}
      {ticker.length > 0 && (
        <div className="flex items-center gap-3 overflow-hidden border-b border-border/40 bg-muted/20 px-4 py-1.5">
          <div className="flex flex-shrink-0 items-center gap-1.5">
            {/* Subtle static indicator — no animate-live flashing */}
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/70" />
            <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50 select-none">
              Market
            </span>
          </div>
          <div className="relative flex-1 overflow-hidden">
            <div className="flex animate-ticker items-center gap-8 whitespace-nowrap">
              {ticker.map((q, i) => {
                const positive = (q.changePercent ?? 0) >= 0;
                return (
                  <div key={`${q.symbol}-${i}`} className="flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-foreground/70">{q.symbol}</span>
                    <span className="font-mono font-medium text-foreground/80">{formatINR(q.ltp)}</span>
                    <span className={twMerge(
                      "flex items-center gap-0.5 font-medium",
                      positive ? "text-emerald-500/80" : "text-red-400/80"
                    )}>
                      {positive ? <TrendingUp className="h-2.5 w-2.5 opacity-60" /> : <TrendingDown className="h-2.5 w-2.5 opacity-60" />}
                      {positive ? "+" : ""}{(q.changePercent ?? 0).toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <span className="flex-shrink-0 text-[10px] font-medium text-muted-foreground/40 select-none">
            IST
          </span>
        </div>
      )}

      {/* ── Main Header Row ── */}
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        {/* Page title — editorial serif per UX spec */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-bold text-foreground font-editorial tracking-tight">{primary}</h1>
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
            <span className="hidden lg:inline text-xs">Search</span>
            <kbd className="hidden lg:inline rounded border border-border bg-background px-1 py-0.5 text-[10px] font-mono text-muted-foreground/50">
              ⌘K
            </kbd>
          </button>

          {/* Notifications */}
          <button
            onClick={() => router.push("/dashboard/notifications")}
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Bell className="h-4 w-4" />
            {!!unread && unread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground shadow-sm">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>

          {/* User avatar */}
          <button
            onClick={() => router.push("/dashboard/profile")}
            className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-2.5 py-1.5 cursor-pointer hover:bg-muted"
          >
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-[10px] font-bold text-white">
              {initial}
            </div>
            {displayName && (
              <span className="hidden md:inline text-xs font-semibold text-foreground">
                {displayName}
              </span>
            )}
          </button>

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
