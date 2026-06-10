"use client";

/** Hooks for user-service (port 8082) — profile, KYC, risk profile. */
import { useQuery } from "@tanstack/react-query";
import { userApi, unwrap } from "@/lib/api";
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
