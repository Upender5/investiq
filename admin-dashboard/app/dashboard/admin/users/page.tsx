"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useAdminUsers, useUpdateUserStatus } from "@/lib/hooks";
import { getRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getApiErrorMessage } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from "@/components/ui/table";

const STATUS_OPTIONS = ["", "ACTIVE", "SUSPENDED", "CLOSED"];
const KYC_OPTIONS = ["", "PENDING", "VERIFIED", "REJECTED"];

function kycBadge(s?: string) {
  const map: Record<string, "success" | "warning" | "danger" | "secondary"> = {
    VERIFIED: "success", PENDING: "warning", REJECTED: "danger",
  };
  return <Badge variant={map[s ?? ""] ?? "secondary"}>{s ?? "—"}</Badge>;
}

function statusBadge(s?: string) {
  const map: Record<string, "success" | "warning" | "danger" | "secondary"> = {
    ACTIVE: "success", SUSPENDED: "warning", CLOSED: "danger",
  };
  return <Badge variant={map[s ?? ""] ?? "secondary"}>{s ?? "ACTIVE"}</Badge>;
}

export default function AdminUsersPage() {
  const canWrite = hasPermission(getRoles(), "admin:users:write");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [kycStatus, setKycStatus] = useState("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useAdminUsers({ search, status, kycStatus, page, size: 20 });
  const updateStatus = useUpdateUserStatus();

  const users = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  function applySearch() {
    setPage(0);
    setSearch(searchInput.trim());
  }

  function changeStatus(userId: string, next: string) {
    setError(null);
    const reason = next === "SUSPENDED" || next === "CLOSED"
      ? window.prompt(`Reason for setting account to ${next}:`) ?? undefined
      : undefined;
    updateStatus.mutate(
      { userId, status: next, reason },
      { onError: (e) => setError(getApiErrorMessage(e)) }
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="Search by name, email or phone…"
            className="w-full rounded-lg border border-input bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          />
        </div>
        <select value={status} onChange={(e) => { setPage(0); setStatus(e.target.value); }}
          className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground">
          {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o || "All statuses"}</option>)}
        </select>
        <select value={kycStatus} onChange={(e) => { setPage(0); setKycStatus(e.target.value); }}
          className="rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground">
          {KYC_OPTIONS.map((o) => <option key={o} value={o}>{o || "All KYC"}</option>)}
        </select>
        <Button size="sm" variant="secondary" onClick={applySearch}>Search</Button>
      </div>

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-loss">{error}</p>}

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-input border-t-primary" /></div>
          ) : users.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground/70">No users found.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Contact</TableHeader>
                  <TableHeader>KYC</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Location</TableHeader>
                  {canWrite && <TableHeader>Actions</TableHeader>}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-foreground">{u.fullName ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{u.email ?? "—"}</div>
                      <div>{u.phone ?? ""}</div>
                    </TableCell>
                    <TableCell>{kycBadge(u.kycStatus)}</TableCell>
                    <TableCell>{statusBadge(u.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[u.city, u.state].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    {canWrite && (
                      <TableCell>
                        {u.status === "SUSPENDED" || u.status === "CLOSED" ? (
                          <Button size="sm" variant="success" onClick={() => changeStatus(u.id, "ACTIVE")} loading={updateStatus.isPending}>
                            Activate
                          </Button>
                        ) : (
                          <Button size="sm" variant="danger" onClick={() => changeStatus(u.id, "SUSPENDED")} loading={updateStatus.isPending}>
                            Suspend
                          </Button>
                        )}
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
