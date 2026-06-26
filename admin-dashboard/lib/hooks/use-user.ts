"use client";

/** Hooks for user-service (port 8082) — profile, KYC, banks, risk + auth devices. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, userApi, unwrap, unwrapPage } from "@/lib/api";
import type { User } from "@/types";

export function useProfile() {
  return useQuery<User>({
    queryKey: ["user", "profile"],
    queryFn: async () => unwrap(await userApi.get("/users/me")),
  });
}

export function useKycStatus() {
  return useQuery({
    queryKey: ["user", "kyc"],
    queryFn: async () => unwrap(await userApi.get("/users/me/kyc")),
  });
}

export function useRiskProfile() {
  return useQuery({
    queryKey: ["user", "risk-profile"],
    queryFn: async () => unwrap(await userApi.get("/users/me/risk-profile")),
  });
}

export interface BankAccount {
  id: string;
  bankName?: string;
  bank?: string;
  accountNumber: string;
  ifsc: string;
  primary?: boolean;
  verified?: boolean;
}

export function useBankAccounts() {
  return useQuery<BankAccount[]>({
    queryKey: ["user", "bank-accounts"],
    queryFn: async () => unwrapPage(await userApi.get("/users/me/bank-accounts")),
    placeholderData: [],
  });
}

export function useRemoveBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userApi.delete(`/users/me/bank-accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user", "bank-accounts"] }),
  });
}

export interface TrustedDevice {
  id: string;
  deviceId?: string;
  name?: string;
  deviceName?: string;
  location?: string;
  lastActive?: string;
  lastSeenAt?: string;
  current?: boolean;
}

/** Trusted devices from auth-service — GET /auth/devices */
export function useDevices() {
  return useQuery<TrustedDevice[]>({
    queryKey: ["auth", "devices"],
    queryFn: async () => unwrapPage(await authApi.get("/auth/devices")),
    placeholderData: [],
  });
}

export function useRevokeDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => authApi.delete(`/auth/devices/${deviceId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auth", "devices"] }),
  });
}
