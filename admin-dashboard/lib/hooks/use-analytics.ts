"use client";

/** Hooks for analytics-service (port 9003) — /api/v1/analytics/* */
import { useQuery } from "@tanstack/react-query";
import { analyticsApi, unwrap } from "@/lib/api";
import type { Holding, PnlHistory, PortfolioSummary } from "@/types";

export interface DashboardAnalytics {
  portfolioValue: number;
  totalPnl: number;
  totalPnlPercent: number;
  activePositions: number;
  todayPnl?: number;
  walletBalance?: number;
  pnlHistory?: PnlHistory[];
}

export function useDashboardAnalytics() {
  return useQuery<DashboardAnalytics>({
    queryKey: ["analytics", "dashboard"],
    queryFn: async () => unwrap(await analyticsApi.get("/analytics/dashboard")),
  });
}

export function usePnlHistory(days = 90) {
  return useQuery<PnlHistory[]>({
    queryKey: ["analytics", "pnl-history", days],
    queryFn: async () => unwrap(await analyticsApi.get(`/analytics/pnl-history?days=${days}`)),
    placeholderData: [],
  });
}

export interface PortfolioAnalytics {
  summary: PortfolioSummary;
  holdings: Holding[];
}

export function usePortfolioAnalytics() {
  return useQuery<PortfolioAnalytics>({
    queryKey: ["analytics", "portfolio"],
    queryFn: async () => {
      const data = unwrap<Record<string, unknown>>(await analyticsApi.get("/analytics/portfolio"));
      // Normalise: service returns { summary, positions } — fall back gracefully
      const holdings = (data.holdings ?? data.positions ?? []) as Holding[];
      const summary = (data.summary ?? data) as PortfolioSummary;
      return { summary, holdings };
    },
  });
}

export interface AllocationSliceDto {
  name: string;
  value: number;
  color: string;
}

export function useAllocation() {
  return useQuery<AllocationSliceDto[]>({
    queryKey: ["analytics", "allocation"],
    queryFn: async () => {
      const data = unwrap<Record<string, unknown>>(await analyticsApi.get("/analytics/allocation"));
      return (data.sectors ?? data) as AllocationSliceDto[];
    },
    placeholderData: [],
  });
}

export function usePerformance(period: "1M" | "3M" | "6M" | "1Y" | "MAX" = "1Y") {
  return useQuery({
    queryKey: ["analytics", "performance", period],
    queryFn: async () => unwrap(await analyticsApi.get(`/analytics/performance?period=${period}`)),
  });
}

export function useCapitalGains() {
  return useQuery({
    queryKey: ["analytics", "capital-gains"],
    queryFn: async () => unwrap(await analyticsApi.get("/analytics/reports/capital-gains")),
  });
}

export function useMarketInsights() {
  return useQuery({
    queryKey: ["analytics", "market-insights"],
    queryFn: async () => unwrap(await analyticsApi.get("/analytics/market")),
  });
}
