"use client";

/** Hooks for fund-service (port 8087) — mutual funds, SIP mandates. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fundsApi, unwrap, unwrapPage } from "@/lib/api";
import type { MutualFund, SIP } from "@/types";

export function useMutualFunds(params?: { category?: string; risk?: string; amc?: string }) {
  return useQuery<MutualFund[]>({
    queryKey: ["funds", "list", params],
    queryFn: async () => {
      const search = new URLSearchParams(params as Record<string, string>).toString();
      return unwrapPage(await fundsApi.get(`/mutual-funds${search ? `?${search}` : ""}`));
    },
  });
}

export function useFundDetail(schemeCode: string) {
  return useQuery<MutualFund>({
    queryKey: ["funds", "detail", schemeCode],
    queryFn: async () => unwrap(await fundsApi.get(`/mutual-funds/${schemeCode}`)),
    enabled: !!schemeCode,
  });
}

export function useTopRatedFunds() {
  return useQuery<MutualFund[]>({
    queryKey: ["funds", "top-rated"],
    queryFn: async () => unwrap(await fundsApi.get("/mutual-funds/top-rated")),
  });
}

export function useFundHoldings() {
  return useQuery({
    queryKey: ["funds", "holdings"],
    queryFn: async () => unwrap(await fundsApi.get("/mutual-funds/holdings")),
  });
}

export function useInvestLumpsum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { schemeCode: string; amount: number }) =>
      fundsApi.post("/mutual-funds/invest", payload, {
        headers: { "Idempotency-Key": crypto.randomUUID() },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["funds"] }),
  });
}

// ─── SIP ─────────────────────────────────────────────────────────────────────

export function useSips() {
  return useQuery<SIP[]>({
    queryKey: ["funds", "sips"],
    queryFn: async () => unwrap(await fundsApi.get("/sip")),
  });
}

export function useCreateSip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { schemeCode: string; amount: number; frequency: string; startDate?: string }) =>
      fundsApi.post("/sip", payload, { headers: { "Idempotency-Key": crypto.randomUUID() } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["funds", "sips"] }),
  });
}

export function useUpdateSip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; status?: string; amount?: number }) =>
      fundsApi.put(`/sip/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["funds", "sips"] }),
  });
}

export function useCancelSip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fundsApi.delete(`/sip/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["funds", "sips"] }),
  });
}
