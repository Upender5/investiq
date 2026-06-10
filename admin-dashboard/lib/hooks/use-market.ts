"use client";

/** Hooks for market-data-service (port 8085) — quotes, stocks, watchlists */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { marketApi, unwrap, unwrapPage } from "@/lib/api";
import { generateMockOHLC, mockQuote } from "@/lib/mock-data";
import type { StockQuote } from "@/types";

export interface ChartPoint {
  date: string;
  close: number;
  open?: number;
}

export function useQuote(symbol: string) {
  return useQuery<StockQuote>({
    queryKey: ["market", "quote", symbol],
    queryFn: async () => unwrap(await marketApi.get(`/market/quotes/${symbol}`)),
    placeholderData: mockQuote(symbol),
    refetchInterval: 15_000, // poll quotes during market hours
    enabled: !!symbol,
  });
}

const PERIOD_DAYS: Record<string, number> = { "1D": 1, "1W": 7, "1M": 30, "3M": 90, "1Y": 365, "5Y": 1825 };

export function useOhlcv(symbol: string, period: string, basePrice?: number) {
  return useQuery<ChartPoint[]>({
    queryKey: ["market", "ohlcv", symbol, period],
    queryFn: async () =>
      unwrap(await marketApi.get(`/market/quotes/${symbol}/ohlcv?period=${period}`)),
    placeholderData: () => generateMockOHLC(basePrice ?? 1000, PERIOD_DAYS[period] ?? 90),
    enabled: !!symbol,
  });
}

export function useStockSearch(q: string) {
  return useQuery<StockQuote[]>({
    queryKey: ["market", "search", q],
    queryFn: async () => unwrap(await marketApi.get(`/market/search?q=${encodeURIComponent(q)}`)),
    enabled: q.length >= 2,
  });
}

export function useStocks(params?: { sector?: string; exchange?: string }) {
  return useQuery<StockQuote[]>({
    queryKey: ["market", "stocks", params],
    queryFn: async () => {
      const search = new URLSearchParams(params as Record<string, string>).toString();
      return unwrapPage(await marketApi.get(`/stocks${search ? `?${search}` : ""}`));
    },
  });
}

export function useTopGainers() {
  return useQuery<StockQuote[]>({
    queryKey: ["market", "top-gainers"],
    queryFn: async () => unwrap(await marketApi.get("/stocks/top-gainers")),
  });
}

export function useTopLosers() {
  return useQuery<StockQuote[]>({
    queryKey: ["market", "top-losers"],
    queryFn: async () => unwrap(await marketApi.get("/stocks/top-losers")),
  });
}

export function useFundamentals(symbol: string) {
  return useQuery({
    queryKey: ["market", "fundamentals", symbol],
    queryFn: async () => unwrap(await marketApi.get(`/stocks/${symbol}/fundamentals`)),
    enabled: !!symbol,
  });
}

export interface QuarterlyFinancials {
  period: string;
  revenue: string;
  pat: string;
  eps: string;
}

export function useStockFinancials(symbol: string) {
  return useQuery<{ quarterly: QuarterlyFinancials[] }>({
    queryKey: ["market", "financials", symbol],
    queryFn: async () => unwrap(await marketApi.get(`/stocks/${symbol}/financials`)),
    enabled: !!symbol,
  });
}

export function useStockNews(symbol: string) {
  return useQuery({
    queryKey: ["market", "news", symbol],
    queryFn: async () => unwrap(await marketApi.get(`/stocks/${symbol}/news`)),
    enabled: !!symbol,
  });
}

export function useMarketStatus() {
  return useQuery({
    queryKey: ["market", "status"],
    queryFn: async () => unwrap(await marketApi.get("/market/status")),
    refetchInterval: 60_000,
  });
}

// ─── Watchlists ──────────────────────────────────────────────────────────────

export function useWatchlists() {
  return useQuery({
    queryKey: ["market", "watchlists"],
    queryFn: async () => unwrap(await marketApi.get("/watchlists")),
  });
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ watchlistId, symbol }: { watchlistId: string; symbol: string }) =>
      marketApi.post(`/watchlists/${watchlistId}/items`, { symbol }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["market", "watchlists"] }),
  });
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ watchlistId, symbol }: { watchlistId: string; symbol: string }) =>
      marketApi.delete(`/watchlists/${watchlistId}/items/${symbol}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["market", "watchlists"] }),
  });
}
