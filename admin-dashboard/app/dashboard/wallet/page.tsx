"use client";

import { useQuery } from "@tanstack/react-query";
import { Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { walletApi } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/ui/table";
import type { WalletBalance, WalletTransaction } from "@/types";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

const MOCK_BALANCE: WalletBalance = {
  available: 45230.5,
  locked: 12500.0,
  total: 57730.5,
};

const MOCK_TXNS: WalletTransaction[] = [
  {
    id: "txn-001",
    type: "DEPOSIT",
    amount: 50000,
    description: "Bank transfer — HDFC xxxx4521",
    createdAt: "2025-05-01T10:00:00Z",
  },
  {
    id: "txn-002",
    type: "BUY",
    amount: -24500,
    description: "RELIANCE × 10 @ ₹2450",
    createdAt: "2025-05-05T11:30:00Z",
  },
  {
    id: "txn-003",
    type: "DEPOSIT",
    amount: 25000,
    description: "UPI — user@okicici",
    createdAt: "2025-05-10T09:15:00Z",
  },
  {
    id: "txn-004",
    type: "SELL",
    amount: 19000,
    description: "WIPRO × 20 @ ₹950",
    createdAt: "2025-05-15T14:00:00Z",
  },
  {
    id: "txn-005",
    type: "WITHDRAWAL",
    amount: -10000,
    description: "Withdraw to SBI xxxx7890",
    createdAt: "2025-05-18T16:45:00Z",
  },
  {
    id: "txn-006",
    type: "BUY",
    amount: -12000,
    description: "INFY × 8 @ ₹1500",
    createdAt: "2025-05-22T10:20:00Z",
  },
];

function txnTypeBadge(type: string) {
  const config: Record<string, { variant: "success" | "danger" | "info" | "secondary"; label: string }> = {
    DEPOSIT: { variant: "success", label: "Deposit" },
    WITHDRAWAL: { variant: "danger", label: "Withdrawal" },
    BUY: { variant: "info", label: "Buy" },
    SELL: { variant: "secondary", label: "Sell" },
  };
  const c = config[type] ?? { variant: "secondary" as const, label: type };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

export default function WalletPage() {
  const { data: balance } = useQuery<WalletBalance>({
    queryKey: ["wallet-balance"],
    queryFn: async () => {
      const res = await walletApi.get("/wallet/balance");
      return res.data;
    },
    placeholderData: MOCK_BALANCE,
  });

  const { data: transactions, isLoading } = useQuery<WalletTransaction[]>({
    queryKey: ["wallet-transactions"],
    queryFn: async () => {
      const res = await walletApi.get("/wallet/transactions?size=50");
      return res.data?.content ?? res.data;
    },
    placeholderData: MOCK_TXNS,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Wallet</h2>
        <p className="text-sm text-slate-400">Balance and transaction history</p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-indigo-500/30 bg-indigo-500/10">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-500/20 p-3">
              <Wallet className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Balance</p>
              <p className="text-2xl font-bold text-white">
                {formatINR(balance?.total ?? 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-3">
              <ArrowDownCircle className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Available</p>
              <p className="text-xl font-bold text-green-400">
                {formatINR(balance?.available ?? 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-500/10 p-3">
              <ArrowUpCircle className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Locked (In Orders)</p>
              <p className="text-xl font-bold text-yellow-400">
                {formatINR(balance?.locked ?? 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button variant="success">
          <ArrowDownCircle className="h-4 w-4" /> Add Funds
        </Button>
        <Button variant="secondary">
          <ArrowUpCircle className="h-4 w-4" /> Withdraw
        </Button>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Txn ID</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Description</TableHeader>
                  <TableHeader className="text-right">Amount</TableHeader>
                  <TableHeader>Date</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(transactions ?? []).map((txn) => {
                  const isCredit = txn.amount > 0;
                  return (
                    <TableRow key={txn.id}>
                      <TableCell className="font-mono text-xs text-slate-400">
                        {txn.id}
                      </TableCell>
                      <TableCell>{txnTypeBadge(txn.type)}</TableCell>
                      <TableCell className="text-slate-300">
                        {txn.description}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          isCredit ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {isCredit ? "+" : ""}
                        {formatINR(txn.amount)}
                      </TableCell>
                      <TableCell>
                        {new Date(txn.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
