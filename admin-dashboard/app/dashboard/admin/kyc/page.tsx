"use client";

import { useState } from "react";
import { useKycQueue, useApproveKyc, useRejectKyc } from "@/lib/hooks";
import { getRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getApiErrorMessage } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

const STATUS_TABS = ["PENDING", "VERIFIED", "REJECTED"];

function statusBadge(s?: string) {
  const map: Record<string, "success" | "warning" | "danger"> = {
    VERIFIED: "success", PENDING: "warning", REJECTED: "danger",
  };
  return <Badge variant={map[s ?? ""] ?? "warning"}>{s ?? "PENDING"}</Badge>;
}

export default function AdminKycPage() {
  const canReview = hasPermission(getRoles(), "admin:kyc:write");
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useKycQueue({ status, page, size: 20 });
  const approve = useApproveKyc();
  const reject = useRejectKyc();

  const items = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const busy = approve.isPending || reject.isPending;

  function onApprove(kycId: string) {
    setError(null);
    const remarks = window.prompt("Approval remarks (optional):") ?? undefined;
    approve.mutate({ kycId, remarks }, { onError: (e) => setError(getApiErrorMessage(e)) });
  }

  function onReject(kycId: string) {
    setError(null);
    const reason = window.prompt("Reason for rejection (required):");
    if (!reason) return;
    reject.mutate({ kycId, reason }, { onError: (e) => setError(getApiErrorMessage(e)) });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => { setPage(0); setStatus(s); }}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${status === s ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-loss">{error}</p>}

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-input border-t-primary" /></div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground/70">No {status.toLowerCase()} KYC submissions.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Document Type</TableHeader>
                  <TableHeader>Number</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Submitted</TableHeader>
                  {canReview && status === "PENDING" && <TableHeader>Review</TableHeader>}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((k) => (
                  <TableRow key={k.documentId}>
                    <TableCell className="font-medium text-foreground">{k.documentType ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{k.documentNumber ?? "—"}</TableCell>
                    <TableCell>
                      {statusBadge(k.status)}
                      {k.rejectionReason && <p className="mt-1 text-[10px] text-loss">{k.rejectionReason}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{k.submittedAt ? formatDate(k.submittedAt) : "—"}</TableCell>
                    {canReview && status === "PENDING" && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="success" loading={busy} onClick={() => onApprove(k.documentId)}>Approve</Button>
                          <Button size="sm" variant="danger" loading={busy} onClick={() => onReject(k.documentId)}>Reject</Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
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
