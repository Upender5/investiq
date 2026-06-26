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

export interface ChannelConfig {
  push: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export interface NotificationSettings {
  userId?: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  categories?: Record<string, ChannelConfig>;
}

/** GET /notifications/settings — channel + category preferences. */
export function useNotificationSettings() {
  return useQuery<NotificationSettings>({
    queryKey: ["notifications", "settings"],
    queryFn: async () => unwrap(await notificationApi.get("/notifications/settings")),
  });
}

/** PUT /notifications/settings — partial update of channel/category preferences. */
export function useUpdateNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<NotificationSettings>) =>
      notificationApi.put("/notifications/settings", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", "settings"] }),
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
