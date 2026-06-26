"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, ShieldCheck, Flag, ScrollText, AlertTriangle } from "lucide-react";
import { getRoles } from "@/lib/auth";
import { hasPermission, requiredPermissionForPath, type Permission } from "@/lib/rbac";
import { twMerge } from "tailwind-merge";

const ADMIN_NAV: { href: string; label: string; permission: Permission; icon: React.ElementType }[] = [
  { href: "/dashboard/admin", label: "Overview", permission: "admin:dashboard", icon: LayoutDashboard },
  { href: "/dashboard/admin/users", label: "Users", permission: "admin:users:read", icon: Users },
  { href: "/dashboard/admin/kyc", label: "KYC Review", permission: "admin:kyc:read", icon: ShieldCheck },
  { href: "/dashboard/admin/fraud", label: "Fraud Monitor", permission: "admin:fraud:read", icon: AlertTriangle },
  { href: "/dashboard/admin/features", label: "Feature Flags", permission: "admin:features:read", icon: Flag },
  { href: "/dashboard/admin/audit", label: "Audit Log", permission: "admin:audit:read", icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Re-check the route's required permission on every navigation. Soft client-side
  // navigations don't hit the edge middleware, so this guard is the real enforcement.
  useEffect(() => {
    const required = requiredPermissionForPath(pathname);
    const roles = getRoles();
    if (required && !hasPermission(roles, required)) {
      router.replace("/dashboard/unauthorized");
      return;
    }
    setReady(true);
  }, [pathname, router]);

  const roles = getRoles();
  const visibleNav = ADMIN_NAV.filter((n) => hasPermission(roles, n.permission));

  if (!ready) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Console</h1>
        <p className="text-sm text-muted-foreground">User management, KYC review, fraud monitoring and audit trail</p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-border">
        {visibleNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={twMerge(
                "flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
