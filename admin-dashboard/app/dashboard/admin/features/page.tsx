"use client";

import { useState } from "react";
import { useFeatureFlags, useUpdateFeatureFlag } from "@/lib/hooks";
import { getRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getApiErrorMessage } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FlagState {
  enabled: boolean;
  rolloutPercent: number;
}

function normalizeFlag(value: unknown): FlagState {
  if (typeof value === "boolean") return { enabled: value, rolloutPercent: value ? 100 : 0 };
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    return {
      enabled: Boolean(v.enabled ?? v.active ?? false),
      rolloutPercent: typeof v.rolloutPercent === "number" ? v.rolloutPercent : (v.enabled ? 100 : 0),
    };
  }
  return { enabled: false, rolloutPercent: 0 };
}

function humanize(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_.-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminFeaturesPage() {
  const canWrite = hasPermission(getRoles(), "admin:features:write");
  const { data, isLoading } = useFeatureFlags();
  const update = useUpdateFeatureFlag();
  const [error, setError] = useState<string | null>(null);

  const flags = data ? Object.entries(data) : [];

  function toggle(flag: string, current: FlagState) {
    setError(null);
    update.mutate(
      { flag, enabled: !current.enabled, rolloutPercent: current.rolloutPercent || 100 },
      { onError: (e) => setError(getApiErrorMessage(e)) }
    );
  }

  return (
    <div className="space-y-4">
      {!canWrite && (
        <p className="rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          Read-only — only SUPER_ADMIN can change feature flags.
        </p>
      )}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-loss">{error}</p>}

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-input border-t-primary" /></div>
      ) : flags.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground/70">No feature flags defined.</p>
      ) : (
        <div className="space-y-3">
          {flags.map(([name, value]) => {
            const flag = normalizeFlag(value);
            return (
              <Card key={name}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{humanize(name)}</p>
                      <Badge variant={flag.enabled ? "success" : "secondary"}>{flag.enabled ? "On" : "Off"}</Badge>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/70">{name} · rollout {flag.rolloutPercent}%</p>
                  </div>
                  <button
                    disabled={!canWrite || update.isPending}
                    onClick={() => toggle(name, flag)}
                    className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${flag.enabled ? "bg-primary" : "bg-secondary"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${flag.enabled ? "left-5" : "left-0.5"}`} />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
