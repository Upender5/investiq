"use client";

import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications, useMarkRead, useMarkAllRead } from "@/lib/hooks";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { twMerge } from "tailwind-merge";

function notifTypeBadge(type: string) {
  const config: Record<string, "success" | "info" | "warning" | "secondary"> = {
    TRADE: "success",
    WALLET: "info",
    ALERT: "warning",
    SYSTEM: "secondary",
  };
  return <Badge variant={config[type] ?? "secondary"}>{type}</Badge>;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // notification-service: GET /notifications, PUT /{id}/read, PUT /read-all.
  const { data: notifData, isLoading } = useNotifications();
  const notifications = notifData ?? [];

  const markReadMutation = useMarkRead();
  const markAllReadMutation = useMarkAllRead();

  const displayed = (notifications ?? []).filter((n) =>
    filter === "unread" ? !n.read : true
  );

  const unreadCount = (notifications ?? []).filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            loading={markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "unread"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={twMerge(
              "rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors",
              filter === tab
                ? "bg-primary text-white"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {tab}
            {tab === "unread" && unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-xs">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-input border-t-primary" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground/80">
          <Bell className="mb-3 h-12 w-12" />
          <p className="text-lg font-medium">No notifications</p>
          <p className="mt-1 text-sm">
            {filter === "unread" ? "All notifications are read." : "Nothing here yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((notif) => (
            <Card
              key={notif.id}
              className={twMerge(
                "transition-colors",
                !notif.read
                  ? "border-primary/30 bg-primary/5"
                  : "opacity-70"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {!notif.read && (
                      <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <p className="font-semibold text-foreground">{notif.title}</p>
                    {notifTypeBadge(notif.type)}
                  </div>
                  <p className="mt-1.5 text-sm text-foreground/80">
                    {notif.message}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground/80">
                    {new Date(notif.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {!notif.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markReadMutation.mutate(notif.id)}
                    loading={markReadMutation.isPending}
                    title="Mark as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
