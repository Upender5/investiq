import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, isTokenExpiredValue, rolesFromToken } from "@/lib/rbac";

const TOKEN_COOKIE = "investiq_token";

/**
 * First line of defense — runs at the edge before any page renders.
 *
 *  • Unauthenticated users hitting a protected route → /login?from=<path>
 *  • Authenticated users hitting /login → /dashboard
 *  • Authenticated-but-unauthorized users hitting an /admin route → /dashboard/unauthorized
 *
 * The client-side guards (AuthGuard/RoleGuard) re-check on the client so this stays
 * correct even if the cookie and localStorage ever diverge.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const authed = !!token && !isTokenExpiredValue(token);

  const isLogin = pathname === "/login" || pathname.startsWith("/login/");
  const isProtected = pathname.startsWith("/dashboard");

  if (authed && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (isProtected) {
    if (!authed) {
      const url = new URL("/login", req.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    const roles = rolesFromToken(token!);
    if (!canAccessPath(pathname, roles)) {
      return NextResponse.redirect(new URL("/dashboard/unauthorized", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
