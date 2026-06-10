import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { getAccessToken, clearTokens } from "./auth";

/**
 * All Java/Python services wrap payloads as
 * `{ success, data, code, message, timestamp }` (ApiResponse<T>).
 * Spring pageable endpoints additionally nest `{ content: [...] }`.
 * unwrap() tolerates raw payloads so mocks and FastAPI responses also work.
 */
export function unwrap<T>(res: AxiosResponse): T {
  const body = res.data;
  if (body && typeof body === "object" && "data" in body && ("success" in body || "code" in body)) {
    return body.data as T;
  }
  return body as T;
}

/** unwrap + flatten a Spring Page<T> into T[]. */
export function unwrapPage<T>(res: AxiosResponse): T[] {
  const data = unwrap<{ content?: T[] } | T[]>(res);
  if (Array.isArray(data)) return data;
  return data?.content ?? [];
}

function createApiInstance(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
  });

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
    (error) => {
      if (error.response?.status === 401) {
        clearTokens();
        if (typeof window !== "undefined") window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

// ─── Core Services ────────────────────────────────────────────────────────────

export const authApi = createApiInstance(
  process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:8081/api/v1"
);

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
