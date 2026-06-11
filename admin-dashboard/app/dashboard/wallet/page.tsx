"use client";

import { Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useWallet, useWalletTransactions, useDeposit, useWithdraw } from "@/lib/hooks";
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
function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

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
  // wallet-service: GET /wallets/by-user/{userId} + /{walletId}/transactions.
  const { data: wallet } = useWallet();
  const balance = wallet;
  const { data: txnData, isLoading } = useWalletTransactions(wallet?.id);
  const transactions = txnData ?? [];

  const deposit = useDeposit();
  const withdraw = useWithdraw();

  function handleDeposit() {
    if (!wallet?.id) return;
    const input = window.prompt("Amount to add (₹):");
    const amount = Number(input);
    if (!input || Number.isNaN(amount) || amount <= 0) return;
    deposit.mutate({ walletId: wallet.id, amount });
  }

  function handleWithdraw() {
    if (!wallet?.id) return;
    const input = window.prompt("Amount to withdraw (₹):");
    const amount = Number(input);
    if (!input || Number.isNaN(amount) || amount <= 0) return;
    withdraw.mutate({ walletId: wallet.id, amount });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Wallet</h2>
        <p className="text-sm text-muted-foreground">Balance and transaction history</p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-primary/30 bg-primary/10">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/20 p-3">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-bold text-foreground">
                {formatINR(balance?.total ?? 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-3">
              <ArrowDownCircle className="h-6 w-6 text-profit" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-xl font-bold text-profit">
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
              <p className="text-sm text-muted-foreground">Locked (In Orders)</p>
              <p className="text-xl font-bold text-yellow-400">
                {formatINR(balance?.locked ?? 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="success"
          onClick={handleDeposit}
          disabled={!wallet?.id}
          loading={deposit.isPending}
        >
          <ArrowDownCircle className="h-4 w-4" /> Add Funds
        </Button>
        <Button
          variant="secondary"
          onClick={handleWithdraw}
          disabled={!wallet?.id}
          loading={withdraw.isPending}
        >
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
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-input border-t-primary" />
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
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {txn.id}
                      </TableCell>
                      <TableCell>{txnTypeBadge(txn.type)}</TableCell>
                      <TableCell className="text-foreground/80">
                        {txn.description}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          isCredit ? "text-profit" : "text-loss"
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
