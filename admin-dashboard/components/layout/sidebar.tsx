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
} from "lucide-react";
import { twMerge } from "tailwind-merge";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/portfolio", label: "Portfolio", icon: BarChart3 },
  { href: "/dashboard/trades", label: "Trades", icon: ArrowLeftRight },
  { href: "/dashboard/market", label: "Market", icon: TrendingUp },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-700 bg-slate-900">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-slate-700 px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold text-white">InvestIQ</span>
          <p className="text-xs text-slate-400">Admin Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={twMerge(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 px-3 py-4">
        <p className="px-3 text-xs text-slate-500">
          InvestIQ v0.1.0 · India
        </p>
      </div>
    </aside>
  );
}
