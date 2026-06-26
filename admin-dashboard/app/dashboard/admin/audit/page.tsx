"use client";

import { useState } from "react";
import { useAuditLogs, type AuditEntry } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";

function pick(row: AuditEntry, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v != null && typeof v !== "object") return String(v);
  }
  return undefined;
}

function details(row: AuditEntry): string {
  const known = new Set(["createdAt", "timestamp", "time", "eventType", "type", "event", "userId", "user", "id"]);
  const rest = Object.entries(row).filter(([k, v]) => !known.has(k) && v != null);
  const msg = pick(row, ["description", "message", "action", "detail", "details"]);
  if (msg) return msg;
  return rest.map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`).join("  ") || "—";
}

export default function AdminAuditPage() {
  const [eventType, setEventType] = useState("");
  const [userId, setUserId] = useState("");
  const [applied, setApplied] = useState<{ eventType?: string; userId?: string }>({});
  const [page, setPage] = useState(0);

  const { data, isLoading } = useAuditLogs({ ...applied, page, size: 20 });
  const rows = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  function apply() {
    setPage(0);
    setApplied({ eventType: eventType.trim() || undefined, userId: userId.trim() || undefined });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input value={eventType} onChange={(e) => setEventType(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder="Event type (e.g. ORDER_EXECUTED)"
          className="min-w-48 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none" />
        <input value={userId} onChange={(e) => setUserId(e.target.value)} onKeyDown={(e) => e.key === "Enter" && apply()}
          placeholder="User ID"
          className="min-w-48 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none" />
        <Button size="sm" variant="secondary" onClick={apply}>Filter</Button>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-input border-t-primary" /></div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground/70">No audit entries.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Time</TableHeader>
                  <TableHeader>Event</TableHeader>
                  <TableHeader>User</TableHeader>
                  <TableHeader>Details</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, i) => {
                  const time = pick(row, ["createdAt", "timestamp", "time"]);
                  const event = pick(row, ["eventType", "type", "event"]);
                  const user = pick(row, ["userId", "user"]);
                  return (
                    <TableRow key={(row.id as string) ?? i}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {time ? new Date(time).toLocaleString("en-IN") : "—"}
                      </TableCell>
                      <TableCell>{event ? <Badge variant="secondary">{event}</Badge> : "—"}</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{user ?? "—"}</TableCell>
                      <TableCell className="text-xs text-foreground/80">{details(row)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
            <Button size="sm" variant="secondary" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
