"use client";

/** Hooks for the admin console — user-service (port 8082) /api/v1/admin/* endpoints. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, unwrap } from "@/lib/api";

/** Spring Page envelope (kept whole so tables can paginate). */
export interface Paged<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

const EMPTY_PAGE: Paged<never> = { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 };

function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ─── Dashboard metrics ─────────────────────────────────────────────────────

export function useAdminDashboard() {
  return useQuery<Record<string, unknown>>({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => unwrap(await adminApi.get("/admin/dashboard")),
  });
}

// ─── Users ───────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  phone?: string;
  email?: string;
  fullName?: string;
  kycStatus?: string;
  status?: string;
  city?: string;
  state?: string;
  createdAt?: string;
}

export function useAdminUsers(params: { search?: string; status?: string; kycStatus?: string; page?: number; size?: number }) {
  return useQuery<Paged<AdminUser>>({
    queryKey: ["admin", "users", params],
    queryFn: async () => unwrap(await adminApi.get(`/admin/users${qs({ ...params, sort: "createdAt,desc" } as Record<string, string | number | undefined>)}`)),
    placeholderData: EMPTY_PAGE,
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status, reason }: { userId: string; status: string; reason?: string }) =>
      adminApi.put(`/admin/users/${userId}/status${qs({ status, reason })}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

// ─── KYC review ────────────────────────────────────────────────────────────

export interface KycSubmission {
  documentId: string;
  documentType?: string;
  documentNumber?: string;
  status?: string;
  rejectionReason?: string;
  submittedAt?: string;
}

export function useKycQueue(params: { status?: string; page?: number; size?: number }) {
  return useQuery<Paged<KycSubmission>>({
    queryKey: ["admin", "kyc", params],
    queryFn: async () => unwrap(await adminApi.get(`/admin/kyc${qs(params)}`)),
    placeholderData: EMPTY_PAGE,
  });
}

export function useApproveKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kycId, remarks }: { kycId: string; remarks?: string }) =>
      adminApi.put(`/admin/kyc/${kycId}/approve${qs({ remarks })}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "kyc"] }),
  });
}

export function useRejectKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kycId, reason }: { kycId: string; reason: string }) =>
      adminApi.put(`/admin/kyc/${kycId}/reject${qs({ reason })}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "kyc"] }),
  });
}

// ─── Feature flags ───────────────────────────────────────────────────────

export function useFeatureFlags() {
  return useQuery<Record<string, unknown>>({
    queryKey: ["admin", "features"],
    queryFn: async () => unwrap(await adminApi.get("/admin/features")),
  });
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ flag, enabled, rolloutPercent = 100 }: { flag: string; enabled: boolean; rolloutPercent?: number }) =>
      adminApi.put(`/admin/features/${flag}${qs({ enabled: String(enabled), rolloutPercent })}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "features"] }),
  });
}

// ─── Audit log ─────────────────────────────────────────────────────────────

export type AuditEntry = Record<string, unknown>;

export function useAuditLogs(params: { userId?: string; eventType?: string; from?: string; to?: string; page?: number; size?: number }) {
  return useQuery<Paged<AuditEntry>>({
    queryKey: ["admin", "audit", params],
    queryFn: async () => unwrap(await adminApi.get(`/admin/audit${qs({ ...params, sort: "createdAt,desc" } as Record<string, string | number | undefined>)}`)),
    placeholderData: EMPTY_PAGE,
  });
}
