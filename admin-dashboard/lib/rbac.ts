/**
 * Role-Based + Permission-Based access control — shared by the edge middleware
 * and the client-side route guards so both enforce an identical policy.
 *
 * This module is edge-runtime safe: no `window`, `localStorage`, or Node APIs.
 */

export type Role = "STUDENT" | "SUPPORT" | "COMPLIANCE" | "ADMIN" | "SUPER_ADMIN";

export type Permission =
  | "portfolio:read"
  | "trade:write"
  | "wallet:write"
  | "admin:dashboard"
  | "admin:users:read"
  | "admin:users:write"
  | "admin:kyc:read"
  | "admin:kyc:write"
  | "admin:audit:read"
  | "admin:features:read"
  | "admin:features:write"
  | "admin:fraud:read";

/** What each role is allowed to do. SUPER_ADMIN is granted everything. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  STUDENT: ["portfolio:read", "trade:write", "wallet:write"],
  SUPPORT: ["admin:dashboard", "admin:users:read"],
  COMPLIANCE: [
    "admin:dashboard",
    "admin:users:read",
    "admin:kyc:read",
    "admin:kyc:write",
    "admin:audit:read",
    "admin:fraud:read",
  ],
  ADMIN: [
    "admin:dashboard",
    "admin:users:read",
    "admin:users:write",
    "admin:kyc:read",
    "admin:kyc:write",
    "admin:audit:read",
    "admin:features:read",
    "admin:fraud:read",
  ],
  SUPER_ADMIN: [
    "admin:dashboard",
    "admin:users:read",
    "admin:users:write",
    "admin:kyc:read",
    "admin:kyc:write",
    "admin:audit:read",
    "admin:features:read",
    "admin:features:write",
    "admin:fraud:read",
  ],
};

export const ADMIN_ROLES: Role[] = ["SUPPORT", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"];

/** Path-prefix → permission required to view it. First match wins (order matters). */
const ROUTE_PERMISSIONS: { prefix: string; permission: Permission }[] = [
  { prefix: "/dashboard/admin/users", permission: "admin:users:read" },
  { prefix: "/dashboard/admin/kyc", permission: "admin:kyc:read" },
  { prefix: "/dashboard/admin/audit", permission: "admin:audit:read" },
  { prefix: "/dashboard/admin/features", permission: "admin:features:read" },
  { prefix: "/dashboard/admin/fraud", permission: "admin:fraud:read" },
  { prefix: "/dashboard/admin", permission: "admin:dashboard" },
];

export function permissionsFor(roles: string[]): Set<Permission> {
  const perms = new Set<Permission>();
  for (const r of roles) {
    const role = r.toUpperCase() as Role;
    for (const p of ROLE_PERMISSIONS[role] ?? []) perms.add(p);
  }
  return perms;
}

export function hasPermission(roles: string[], permission: Permission): boolean {
  return permissionsFor(roles).has(permission);
}

/** Returns the permission a path requires, or null if it is a normal protected route. */
export function requiredPermissionForPath(pathname: string): Permission | null {
  return ROUTE_PERMISSIONS.find((r) => pathname.startsWith(r.prefix))?.permission ?? null;
}

/** Can a user with these roles view this protected path? */
export function canAccessPath(pathname: string, roles: string[]): boolean {
  const required = requiredPermissionForPath(pathname);
  if (!required) return true; // any authenticated user
  return hasPermission(roles, required);
}

// ─── Edge-safe JWT payload decode (no signature check — server verifies) ───────

interface DecodedClaims {
  exp?: number;
  roles?: string[];
  authorities?: string[];
  scope?: string;
}

export function decodeJwtPayload(token: string): DecodedClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
    return JSON.parse(decodeURIComponent(escape(json))) as DecodedClaims;
  } catch {
    try {
      return JSON.parse(Buffer.from(parts[1], "base64").toString("utf8")) as DecodedClaims;
    } catch {
      return null;
    }
  }
}

export function rolesFromToken(token: string): string[] {
  const claims = decodeJwtPayload(token);
  if (!claims) return [];
  const raw =
    claims.roles ??
    claims.authorities ??
    (typeof claims.scope === "string" ? claims.scope.split(" ") : []);
  return (raw ?? []).map((r) => String(r).replace(/^ROLE_/, "").toUpperCase());
}

export function isTokenExpiredValue(token: string): boolean {
  const claims = decodeJwtPayload(token);
  if (!claims?.exp) return false;
  return claims.exp * 1000 <= Date.now();
}
