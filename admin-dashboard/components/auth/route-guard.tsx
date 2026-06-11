"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken, getRoles, isTokenExpired } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/rbac";

function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

/**
 * Client-side authentication gate. Mirrors the edge middleware so navigation that
 * never round-trips to the server (client-side route transitions) stays protected,
 * and so a cookie/localStorage divergence can't leak a protected page.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token || isTokenExpired(token)) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }
    setReady(true);
  }, [router, pathname]);

  if (!ready) return <FullScreenLoader />;
  return <>{children}</>;
}

/**
 * Permission/role gate for a subtree (e.g. the admin panel). Renders children only
 * if the user holds the required permission; otherwise redirects to the unauthorized page.
 */
export function RoleGuard({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasPermission(getRoles(), permission)) {
      router.replace("/dashboard/unauthorized");
      return;
    }
    setReady(true);
  }, [router, permission]);

  if (!ready) return <FullScreenLoader />;
  return <>{children}</>;
}
