import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { getAccessToken, clearTokens } from "./auth";

function createApiInstance(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

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

export const analyticsApi = createApiInstance(
  process.env.NEXT_PUBLIC_ANALYTICS_URL || "http://localhost:9003/api/v1"
);

export const scoringApi = createApiInstance(
  process.env.NEXT_PUBLIC_SCORING_URL || "http://localhost:9002/api/v1"
);
