"use client";

/** Hooks for wallet-service (port 8084) — balance, ledger, deposit/withdraw */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { walletApi, unwrap, unwrapPage } from "@/lib/api";
import { getUserId } from "@/lib/auth";
import type { WalletTransaction } from "@/types";

export interface Wallet {
  id: string;
  available: number;
  locked: number;
  total: number;
}

export function useWallet() {
  const userId = getUserId();
  return useQuery<Wallet>({
    queryKey: ["wallet", "balance", userId],
    queryFn: async () => unwrap(await walletApi.get(`/wallets/by-user/${userId}`)),
    enabled: !!userId,
  });
}

export function useWalletTransactions(walletId?: string) {
  return useQuery<WalletTransaction[]>({
    queryKey: ["wallet", "transactions", walletId],
    queryFn: async () => unwrapPage(await walletApi.get(`/wallets/${walletId}/transactions`)),
    enabled: !!walletId,
    placeholderData: [],
  });
}

export function useDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ walletId, amount }: { walletId: string; amount: number }) =>
      walletApi.post(
        `/wallets/${walletId}/deposit`,
        { amount },
        { headers: { "Idempotency-Key": crypto.randomUUID() } }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet"] }),
  });
}

export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ walletId, amount }: { walletId: string; amount: number }) =>
      walletApi.post(
        `/wallets/${walletId}/withdraw`,
        { amount },
        { headers: { "Idempotency-Key": crypto.randomUUID() } }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet"] }),
  });
}
