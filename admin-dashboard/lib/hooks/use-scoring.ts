"use client";

/** Hooks for ml-scoring-service (port 9002) — risk, sentiment, portfolio health. */
import { useQuery } from "@tanstack/react-query";
import { scoringApi, unwrap } from "@/lib/api";
import { getUserId } from "@/lib/auth";

export function useRiskScore() {
  const userId = getUserId();
  return useQuery({
    queryKey: ["scoring", "risk", userId],
    queryFn: async () => unwrap(await scoringApi.get(`/scoring/risk/${userId}`)),
    enabled: !!userId,
  });
}

export function useSentiment(symbol: string) {
  return useQuery({
    queryKey: ["scoring", "sentiment", symbol],
    queryFn: async () => unwrap(await scoringApi.get(`/scoring/sentiment/${symbol}`)),
    enabled: !!symbol,
  });
}

export interface PortfolioHealthScore {
  overallScore: number;
  diversificationScore?: number;
  riskReturnScore?: number;
  recommendations?: string[];
}

export function usePortfolioHealth() {
  const userId = getUserId();
  return useQuery<PortfolioHealthScore>({
    queryKey: ["scoring", "portfolio-health", userId],
    queryFn: async () => unwrap(await scoringApi.get(`/scoring/portfolio-health/${userId}`)),
    enabled: !!userId,
    placeholderData: { overallScore: 68 },
  });
}
