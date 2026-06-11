"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BarChart3, ArrowLeftRight, TrendingUp, Wallet,
  Bell, Brain, BookOpen, Users, FileText, User, ChevronRight,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useState } from "react";
import { ThemeToggle } from "@/lib/theme";
import { Logo } from "@/components/brand/brand-mark";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  children?: { href: string; label: string }[];
  badge?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "MAIN",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    ],
  },
  {
    label: "MARKETS",
    items: [
      {
        href: "/dashboard/market",
        label: "Markets",
        icon: TrendingUp,
        children: [
          { href: "/dashboard/market", label: "Stocks" },
          { href: "/dashboard/funds", label: "Mutual Funds" },
          { href: "/dashboard/ipo", label: "IPO" },
        ],
      },
    ],
  },
  {
    label: "TRADING",
    items: [
      {
        href: "/dashboard/portfolio",
        label: "Portfolio",
        icon: BarChart3,
        children: [
          { href: "/dashboard/portfolio", label: "Holdings" },
          { href: "/dashboard/portfolio/rebalance", label: "Rebalancing" },
        ],
      },
      { href: "/dashboard/trades", label: "Trades", icon: ArrowLeftRight },
      {
        href: "/dashboard/ai-advisor",
        label: "AI Advisor",
        icon: Brain,
        badge: "AI",
        children: [
          { href: "/dashboard/ai-advisor", label: "Copilot Chat" },
          { href: "/dashboard/ai-advisor/health", label: "Portfolio Health" },
          { href: "/dashboard/ai-advisor/goals", label: "Goal Planner" },
          { href: "/dashboard/ai-advisor/screener", label: "AI Screener" },
        ],
      },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
      {
        href: "/dashboard/reports",
        label: "Reports",
        icon: FileText,
        children: [
          { href: "/dashboard/reports", label: "Overview" },
          { href: "/dashboard/reports/capital-gains", label: "Capital Gains" },
        ],
      },
    ],
  },
  {
    label: "COMMUNITY",
    items: [
      { href: "/dashboard/learn", label: "Learn", icon: BookOpen },
      { href: "/dashboard/community", label: "Community", icon: Users },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
      { href: "/dashboard/profile", label: "Profile", icon: User },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>([
    "/dashboard/ai-advisor",
    "/dashboard/market",
  ]);

  function toggle(href: string) {
    setExpanded((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside className="flex h-screen w-60 flex-col bg-background border-r border-border flex-shrink-0">
      {/* ── Logo ── */}
      <div className="flex items-center px-5 py-4 border-b border-border">
        <Logo showTagline />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex flex-1 flex-col overflow-y-auto py-3 px-2">
        {navSections.map(({ label, items }) => (
          <div key={label} className="mb-2">
            <p className="px-3 mb-1.5 text-[9px] font-bold tracking-widest text-muted-foreground/40 uppercase select-none">
              {label}
            </p>
            {items.map(({ href, label: itemLabel, icon: Icon, children, badge }) => {
              const active = isActive(href);
              const open = expanded.includes(href);

              if (!children) {
                return (
                  <Link
                    key={href}
                    href={href}
                    className={twMerge(
                      "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 cursor-pointer",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary" />
                    )}
                    <div className={twMerge(
                      "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors duration-150",
                      active ? "bg-primary/20 text-primary" : "group-hover:bg-secondary"
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="flex-1">{itemLabel}</span>
                  </Link>
                );
              }

              return (
                <div key={href}>
                  <button
                    onClick={() => toggle(href)}
                    className={twMerge(
                      "group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 cursor-pointer",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary" />
                    )}
                    <div className={twMerge(
                      "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md transition-colors duration-150",
                      active ? "bg-primary/20 text-primary" : "group-hover:bg-secondary"
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="flex-1 text-left">{itemLabel}</span>
                    {badge && (
                      <span className="mr-1 rounded-full bg-ai/15 px-1.5 py-0.5 text-[9px] font-bold text-ai">
                        {badge}
                      </span>
                    )}
                    <ChevronRight
                      className={twMerge(
                        "h-3 w-3 transition-transform duration-200",
                        open ? "rotate-90" : ""
                      )}
                    />
                  </button>
                  {open && (
                    <div className="ml-9 mt-0.5 flex flex-col gap-0.5 border-l border-border/60 pl-3 pb-1">
                      {children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={twMerge(
                            "rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer",
                            pathname === child.href
                              ? "text-primary bg-primary/8 font-semibold"
                              : "text-muted-foreground/70 hover:text-foreground hover:bg-accent"
                          )}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── User Footer ── */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-accent/50 px-2.5 py-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-[11px] font-bold text-white shadow-sm">
            U
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">Upender</p>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
              <p className="text-[10px] text-muted-foreground/60">Pro Plan · Active</p>
            </div>
          </div>
          <ThemeToggle className="h-7 w-7 flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
}
