"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useAuditLogs, type AuditEntry } from "@/lib/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";

// No dedicated fraud-scoring feed is exposed yet — this surfaces security-relevant
// entries from the real audit trail (auth/login/order anomalies) the admin can pivot on.
const SIGNAL_TYPES = ["LOGIN", "AUTH_FAILED", "FRAUD_FLAG", "ORDER_REJECTED", "KYC_REJECTED"];

function pick(row: AuditEntry, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v != null && typeof v !== "object") return String(v);
  }
  return undefined;
}

export default function AdminFraudPage() {
  const [eventType, setEventType] = useState<string>(SIGNAL_TYPES[0]);
  const [page, setPage] = useState(0);
  const { data, isLoading } = useAuditLogs({ eventType, page, size: 20 });
  const rows = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-xs text-yellow-300">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
        Surfaces security-relevant audit events. A dedicated ML fraud-scoring feed is not yet exposed by the backend.
      </div>

      <div className="flex flex-wrap gap-2">
        {SIGNAL_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => { setPage(0); setEventType(t); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${eventType === t ? "bg-primary text-white" : "bg-card text-muted-foreground border border-border hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-input border-t-primary" /></div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground/70">No {eventType} events.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Time</TableHeader>
                  <TableHeader>Event</TableHeader>
                  <TableHeader>User</TableHeader>
                  <TableHeader>IP / Detail</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, i) => {
                  const time = pick(row, ["createdAt", "timestamp", "time"]);
                  const user = pick(row, ["userId", "user"]);
                  const detail = pick(row, ["ip", "ipAddress", "description", "message", "detail"]);
                  return (
                    <TableRow key={(row.id as string) ?? i}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {time ? new Date(time).toLocaleString("en-IN") : "—"}
                      </TableCell>
                      <TableCell><Badge variant="warning">{eventType}</Badge></TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{user ?? "—"}</TableCell>
                      <TableCell className="text-xs text-foreground/80">{detail ?? "—"}</TableCell>
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
