"use client";

/** Hooks for ai-advisor service (port 9001) — chat, reviews, analysis. */
import { useMutation, useQuery } from "@tanstack/react-query";
import { aiAdvisorApi, unwrap } from "@/lib/api";
import { getUserId } from "@/lib/auth";

export interface ChatRequest {
  message: string;
  conversation_id?: string | null;
}

export interface ChatResponse {
  conversation_id?: string;
  answer?: string;
  message?: string;
  disclaimer?: string;
}

/** Conversational advisor — POST /api/v1/ai/chat */
export function useAiChat() {
  return useMutation({
    mutationFn: async (payload: ChatRequest): Promise<ChatResponse> =>
      unwrap(
        await aiAdvisorApi.post("/api/v1/ai/chat", {
          user_id: getUserId() ?? "anonymous",
          ...payload,
        })
      ),
  });
}

export function useConversations() {
  return useQuery({
    queryKey: ["ai", "conversations"],
    queryFn: async () => unwrap(await aiAdvisorApi.get("/api/v1/ai/chat/conversations")),
  });
}

/** Personalised recommendations feed — GET /api/v1/ai/recommendations */
export function useAiRecommendations() {
  return useQuery<{ type: string; text: string }[]>({
    queryKey: ["ai", "recommendations"],
    queryFn: async () => unwrap(await aiAdvisorApi.get("/api/v1/ai/recommendations")),
    placeholderData: [],
  });
}

export interface StockAnalysis {
  symbol: string;
  paragraphs?: string[];
  analysis?: string[];
  disclaimer?: string;
}

/** AI stock analysis — POST /api/v1/ai/stocks/analyze */
export function useStockAnalysis(symbol: string) {
  return useQuery<StockAnalysis>({
    queryKey: ["ai", "stock-analysis", symbol],
    queryFn: async () =>
      unwrap(await aiAdvisorApi.post("/api/v1/ai/stocks/analyze", { symbol })),
    enabled: !!symbol,
    staleTime: 10 * 60 * 1000, // analysis is expensive — cache for 10 min
    retry: 0,
  });
}

/** AI portfolio health review — POST /api/v1/ai/portfolio/review */
export function usePortfolioReview() {
  return useMutation({
    mutationFn: async () =>
      unwrap(await aiAdvisorApi.post("/api/v1/ai/portfolio/review", { user_id: getUserId() })),
  });
}

/** Legacy single-shot recommendation endpoint — POST /api/v1/advisor/recommend */
export function useAdvisorRecommend() {
  return useMutation({
    mutationFn: async (payload: { question: string; risk_profile?: string; budget_inr?: number }) =>
      unwrap<{ answer: string; recommendations: string[]; disclaimer: string }>(
        await aiAdvisorApi.post("/api/v1/advisor/recommend", {
          user_id: getUserId() ?? "anonymous",
          risk_profile: "MODERATE",
          budget_inr: 50000,
          ...payload,
        })
      ),
  });
}
