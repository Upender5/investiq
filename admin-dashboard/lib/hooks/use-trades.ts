"use client";

/** Hooks for trade-service (port 8083) — orders, trades, positions, margins */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tradeApi, unwrap, unwrapPage } from "@/lib/api";
import type { PlaceOrderRequest, Trade } from "@/types";

export function useOrders(params?: { status?: string; symbol?: string; side?: string; size?: number }) {
  return useQuery<Trade[]>({
    queryKey: ["trade", "orders", params],
    queryFn: async () => {
      const search = new URLSearchParams(
        Object.entries(params ?? {}).reduce<Record<string, string>>((acc, [k, v]) => {
          if (v !== undefined) acc[k] = String(v);
          return acc;
        }, {})
      ).toString();
      return unwrapPage(await tradeApi.get(`/orders${search ? `?${search}` : ""}`));
    },
    placeholderData: [],
  });
}

export function useTradeHistory(size = 20) {
  return useQuery<Trade[]>({
    queryKey: ["trade", "history", size],
    queryFn: async () => unwrapPage(await tradeApi.get(`/trades?size=${size}&sort=createdAt,desc`)),
    placeholderData: [],
  });
}

export function usePositions() {
  return useQuery({
    queryKey: ["trade", "positions"],
    queryFn: async () => unwrap(await tradeApi.get("/positions")),
  });
}

export function useMargins() {
  return useQuery({
    queryKey: ["trade", "margins"],
    queryFn: async () => unwrap(await tradeApi.get("/margins")),
  });
}

/** POST /orders — financial mutation, requires Idempotency-Key. */
export function usePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PlaceOrderRequest) =>
      tradeApi.post("/orders", payload, {
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trade"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => tradeApi.delete(`/orders/${orderId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trade", "orders"] }),
  });
}
