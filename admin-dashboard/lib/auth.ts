import type { AuthTokens } from "@/types";

const ACCESS_TOKEN_KEY = "investiq_access_token";
const REFRESH_TOKEN_KEY = "investiq_refresh_token";
const USER_ID_KEY = "investiq_user_id";

// The access token is mirrored into a SameSite=Lax cookie (NOT httpOnly, since the
// SPA also reads it from localStorage) purely so the Next.js edge middleware can gate
// routes before any client JS runs. The refresh token never leaves localStorage.
const TOKEN_COOKIE = "investiq_token";

function setTokenCookie(token: string): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE}=${token}; Path=/; Max-Age=604800; SameSite=Lax${secure}`;
}

function clearTokenCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function saveTokens(tokens: AuthTokens): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  if (tokens.userId) localStorage.setItem(USER_ID_KEY, tokens.userId);
  setTokenCookie(tokens.accessToken);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_ID_KEY);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  clearTokenCookie();
}

// ─── JWT claims ─────────────────────────────────────────────────────────────
// The access token is verified server-side (HS256). The client decodes the
// payload only to read non-sensitive claims (roles, expiry) for routing/UX.

export interface JwtClaims {
  sub?: string;
  exp?: number;
  roles?: string[];
  authorities?: string[];
  scope?: string;
  [key: string]: unknown;
}

export function decodeToken(token: string | null = getAccessToken()): JwtClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(payload)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

/** Normalise roles from whichever claim the auth service used (roles / authorities / scope). */
export function getRoles(token: string | null = getAccessToken()): string[] {
  const claims = decodeToken(token);
  if (!claims) return [];
  const raw =
    claims.roles ??
    claims.authorities ??
    (typeof claims.scope === "string" ? claims.scope.split(" ") : []);
  return (raw ?? []).map((r) => String(r).replace(/^ROLE_/, "").toUpperCase());
}

export function hasRole(role: string, token?: string | null): boolean {
  return getRoles(token).includes(role.toUpperCase());
}

export function hasAnyRole(roles: string[], token?: string | null): boolean {
  const owned = getRoles(token);
  return roles.some((r) => owned.includes(r.toUpperCase()));
}

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "COMPLIANCE", "SUPPORT"];
export function isAdmin(token?: string | null): boolean {
  return hasAnyRole(ADMIN_ROLES, token);
}

export function isTokenExpired(token: string | null = getAccessToken()): boolean {
  const claims = decodeToken(token);
  if (!claims?.exp) return false; // can't tell — let the API 401 decide
  return claims.exp * 1000 <= Date.now();
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function logout(): void {
  clearTokens();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
