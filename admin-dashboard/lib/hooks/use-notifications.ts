"use client";

/** Hooks for notification-service (port 8086). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi, unwrap, unwrapPage } from "@/lib/api";
import type { Notification } from "@/types";

export function useNotifications(params?: { read?: boolean; type?: string }) {
  return useQuery<Notification[]>({
    queryKey: ["notifications", params],
    queryFn: async () => {
      const search = new URLSearchParams(
        Object.entries(params ?? {}).reduce<Record<string, string>>((acc, [k, v]) => {
          if (v !== undefined) acc[k] = String(v);
          return acc;
        }, {})
      ).toString();
      return unwrapPage(await notificationApi.get(`/notifications${search ? `?${search}` : ""}`));
    },
    placeholderData: [],
  });
}

export function useUnreadCount() {
  return useQuery<number>({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const data = unwrap<{ count?: number } | number>(
        await notificationApi.get("/notifications/unread-count")
      );
      return typeof data === "number" ? data : data?.count ?? 0;
    },
    refetchInterval: 60_000,
    placeholderData: 0,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.put(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationApi.put("/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
