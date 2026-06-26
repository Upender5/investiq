"use client";

import { useAdminDashboard } from "@/lib/hooks";
import { Card } from "@/components/ui/card";
import { formatINR } from "@/lib/format";

function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(key: string, value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") {
    const moneyish = /revenue|amount|value|aum|balance/i.test(key);
    return moneyish ? formatINR(value) : value.toLocaleString("en-IN");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function AdminOverviewPage() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-input border-t-primary" />
      </div>
    );
  }

  const entries = data ? Object.entries(data).filter(([, v]) => typeof v !== "object" || v === null) : [];

  if (entries.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground/70">No metrics available.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {entries.map(([key, value]) => (
        <Card key={key} className="py-4">
          <p className="text-xs text-muted-foreground/80">{humanize(key)}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{renderValue(key, value)}</p>
        </Card>
      ))}
    </div>
  );
}
