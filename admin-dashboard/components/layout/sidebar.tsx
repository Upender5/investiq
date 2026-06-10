"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  ArrowLeftRight,
  TrendingUp,
  Wallet,
  Bell,
  Zap,
  Brain,
  BookOpen,
  Users,
  FileText,
  Landmark,
  Star,
  User,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useState } from "react";
import { ThemeToggle } from "@/lib/theme";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  children?: { href: string; label: string }[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
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
    children: [
      { href: "/dashboard/ai-advisor", label: "Copilot Chat" },
      { href: "/dashboard/ai-advisor/health", label: "Portfolio Health" },
      { href: "/dashboard/ai-advisor/goals", label: "Goal Planner" },
      { href: "/dashboard/ai-advisor/screener", label: "AI Screener" },
    ],
  },
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
  { href: "/dashboard/learn", label: "Learn", icon: BookOpen },
  { href: "/dashboard/community", label: "Community", icon: Users },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string[]>(["/dashboard/ai-advisor", "/dashboard/market"]);

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
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-background">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <span className="text-base font-bold text-foreground">InvestIQ</span>
          <p className="text-[10px] text-muted-foreground">Wealth Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
        {navItems.map(({ href, label, icon: Icon, children }) => {
          const active = isActive(href);
          const open = expanded.includes(href);

          if (!children) {
            return (
              <Link
                key={href}
                href={href}
                className={twMerge(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            );
          }

          return (
            <div key={href}>
              <button
                onClick={() => toggle(href)}
                className={twMerge(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {open ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
              {open && (
                <div className="ml-7 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
                  {children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={twMerge(
                        "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                        pathname === child.href
                          ? "text-primary"
                          : "text-muted-foreground/80 hover:text-foreground"
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
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium text-foreground">Upender</p>
            <p className="text-[10px] text-muted-foreground/80">Pro Plan</p>
          </div>
          <ThemeToggle className="h-7 w-7" />
        </div>
      </div>
    </aside>
  );
}
