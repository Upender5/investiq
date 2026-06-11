import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import type { AuthTokens } from "@/types";
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from "./auth";

const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:8081/api/v1";

/**
 * Every InvestIQ service returns the canonical envelope `{ message, data }`.
 * unwrap() returns the inner `data`; it tolerates already-raw payloads so legacy
 * or non-conforming endpoints still work during migration.
 */
export function unwrap<T>(res: AxiosResponse): T {
  const body = res.data;
  if (body && typeof body === "object" && "data" in body && "message" in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/** unwrap + flatten a Spring Page<T> (nested under data.content) into T[]. */
export function unwrapPage<T>(res: AxiosResponse): T[] {
  const data = unwrap<{ content?: T[] } | T[]>(res);
  if (Array.isArray(data)) return data;
  return data?.content ?? [];
}

/** Pull the human-readable message out of any error for toast/inline display. */
export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  const axiosErr = error as AxiosError<{ message?: string }>;
  return axiosErr?.response?.data?.message ?? (error as Error)?.message ?? fallback;
}

// ─── Token refresh (single-flight) ─────────────────────────────────────────────
// One in-flight refresh is shared across all concurrent 401s so we never stampede
// the auth service or rotate the refresh token more than once per expiry.

let refreshPromise: Promise<string> | null = null;

const AUTH_PATHS = ["/auth/refresh", "/auth/login", "/auth/otp", "/auth/register", "/auth/oauth"];
function isAuthEndpoint(url?: string): boolean {
  return !!url && AUTH_PATHS.some((p) => url.includes(p));
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");
  // Bare axios (no interceptors) avoids a refresh→401→refresh loop.
  const res = await axios.post(`${AUTH_BASE}/auth/refresh`, { refreshToken });
  const tokens = unwrap<AuthTokens>(res);
  saveTokens(tokens);
  return tokens.accessToken;
}

function forceLogout(): void {
  clearTokens();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

function attachInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getAccessToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
      const status = error.response?.status;

      if (status === 401 && original && !original._retry && !isAuthEndpoint(original.url)) {
        original._retry = true;
        try {
          refreshPromise ??= refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
          const newToken = await refreshPromise;
          original.headers.Authorization = `Bearer ${newToken}`;
          return instance(original);
        } catch {
          forceLogout();
          return Promise.reject(error);
        }
      }

      if (status === 401) forceLogout();
      return Promise.reject(error);
    }
  );
}

function createApiInstance(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
  });
  attachInterceptors(instance);
  return instance;
}

// ─── Core Services ────────────────────────────────────────────────────────────

export const authApi = createApiInstance(AUTH_BASE);

export const userApi = createApiInstance(
  process.env.NEXT_PUBLIC_USER_URL || "http://localhost:8082/api/v1"
);

export const tradeApi = createApiInstance(
  process.env.NEXT_PUBLIC_TRADE_URL || "http://localhost:8083/api/v1"
);

export const walletApi = createApiInstance(
  process.env.NEXT_PUBLIC_WALLET_URL || "http://localhost:8084/api/v1"
);

export const marketApi = createApiInstance(
  process.env.NEXT_PUBLIC_MARKET_URL || "http://localhost:8085/api/v1"
);

export const notificationApi = createApiInstance(
  process.env.NEXT_PUBLIC_NOTIFICATION_URL || "http://localhost:8086/api/v1"
);

// ─── Fund & Goal Services ─────────────────────────────────────────────────────

export const fundsApi = createApiInstance(
  process.env.NEXT_PUBLIC_FUNDS_URL || "http://localhost:8087/api/v1"
);

// Goals are hosted in user-service under /api/v1/goals
export const goalsApi = userApi;

// ─── AI & Analytics Services ─────────────────────────────────────────────────

export const analyticsApi = createApiInstance(
  process.env.NEXT_PUBLIC_ANALYTICS_URL || "http://localhost:9003/api/v1"
);

export const scoringApi = createApiInstance(
  process.env.NEXT_PUBLIC_SCORING_URL || "http://localhost:9002/api/v1"
);

export const aiAdvisorApi = createApiInstance(
  process.env.NEXT_PUBLIC_AI_ADVISOR_URL || "http://localhost:9001"
);

// ─── Admin (user-service admin endpoints) ────────────────────────────────────

export const adminApi = createApiInstance(
  process.env.NEXT_PUBLIC_USER_URL || "http://localhost:8082/api/v1"
);

// ─── Convenience API helpers ──────────────────────────────────────────────────

export const api = {
  auth: authApi,
  user: userApi,
  trade: tradeApi,
  wallet: walletApi,
  market: marketApi,
  notification: notificationApi,
  funds: fundsApi,
  goals: goalsApi,
  analytics: analyticsApi,
  scoring: scoringApi,
  ai: aiAdvisorApi,
  admin: adminApi,
};
