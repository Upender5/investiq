import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import { auth } from './auth';
import { router } from 'expo-router';

// ─── Base URLs ────────────────────────────────────────────────────────────────
// Change BASE_IP to your machine's local IP when running Expo Go on a device.
const BASE_IP = '192.168.1.100';

const SERVICE_URLS = {
  auth: `http://${BASE_IP}:8081`,
  user: `http://${BASE_IP}:8082`,
  trade: `http://${BASE_IP}:8083`,
  wallet: `http://${BASE_IP}:8084`,
  market: `http://${BASE_IP}:8085`,
  notification: `http://${BASE_IP}:8086`,
} as const;

// ─── Envelope helpers ───────────────────────────────────────────────────────
// Every InvestIQ service returns `{ message, data }`. unwrap() returns the inner
// payload; it tolerates raw bodies so non-conforming endpoints still work.
export function unwrap<T>(res: AxiosResponse): T {
  const body = res.data;
  if (body && typeof body === 'object' && 'data' in body && 'message' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const axiosErr = error as AxiosError<{ message?: string }>;
  return axiosErr?.response?.data?.message ?? (error as Error)?.message ?? fallback;
}

// ─── Interceptor helpers ──────────────────────────────────────────────────────
async function attachToken(
  config: InternalAxiosRequestConfig
): Promise<InternalAxiosRequestConfig> {
  const token = await auth.getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}

const AUTH_PATHS = ['/auth/refresh', '/auth/login', '/auth/otp', '/auth/register'];
const isAuthEndpoint = (url?: string) => !!url && AUTH_PATHS.some((p) => url.includes(p));

// Single-flight refresh shared across all concurrent 401s.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await auth.getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');
  const res = await axios.post(`${SERVICE_URLS.auth}/api/v1/auth/refresh`, { refreshToken });
  const tokens = unwrap<{ accessToken: string; refreshToken: string }>(res);
  await auth.saveTokens(tokens as never);
  return tokens.accessToken;
}

// ─── Factory ──────────────────────────────────────────────────────────────────
function createClient(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
  });

  instance.interceptors.request.use(attachToken);
  instance.interceptors.response.use(
    (res: AxiosResponse) => res,
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
          original.headers = original.headers ?? {};
          original.headers['Authorization'] = `Bearer ${newToken}`;
          return instance(original);
        } catch {
          await auth.logout();
          router.replace('/(auth)/login');
          return Promise.reject(error);
        }
      }

      if (status === 401) {
        await auth.logout();
        router.replace('/(auth)/login');
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

// ─── Named clients ────────────────────────────────────────────────────────────
export const authApi = createClient(SERVICE_URLS.auth);
export const userApi = createClient(SERVICE_URLS.user);
export const tradeApi = createClient(SERVICE_URLS.trade);
export const walletApi = createClient(SERVICE_URLS.wallet);
export const marketApi = createClient(SERVICE_URLS.market);
export const notificationApi = createClient(SERVICE_URLS.notification);

// ─── Typed request helpers ────────────────────────────────────────────────────

// Auth
export const authRequests = {
  sendOtp: (phone: string) =>
    authApi.post<{ message: string }>('/api/v1/auth/otp/send', { phone }),

  verifyOtp: (phone: string, otp: string) =>
    authApi.post<{
      accessToken: string;
      refreshToken: string;
      user: import('../types').User;
    }>('/api/v1/auth/otp/verify', { phone, otp }),
};

// User / Portfolio
export const userRequests = {
  getMe: () => userApi.get<import('../types').User>('/api/v1/users/me'),

  getPortfolio: () =>
    userApi.get<import('../types').Portfolio>('/api/v1/users/me/portfolio'),
};

// Market
export const marketRequests = {
  getTopStocks: () =>
    marketApi.get<import('../types').Stock[]>('/api/v1/market/top'),

  searchStocks: (query: string) =>
    marketApi.get<import('../types').Stock[]>('/api/v1/market/search', {
      params: { q: query },
    }),

  getStock: (symbol: string) =>
    marketApi.get<import('../types').Stock>(`/api/v1/market/stocks/${symbol}`),
};

// Trade
export const tradeRequests = {
  placeOrder: (payload: import('../types').PlaceOrderRequest) =>
    tradeApi.post<import('../types').Order>('/api/v1/trades/orders', payload),

  getOrders: () =>
    tradeApi.get<import('../types').Order[]>('/api/v1/trades/orders'),
};

// Wallet
export const walletRequests = {
  getWallet: () =>
    walletApi.get<import('../types').Wallet>('/api/v1/wallet'),

  getTransactions: () =>
    walletApi.get<import('../types').Transaction[]>('/api/v1/wallet/transactions'),
};
