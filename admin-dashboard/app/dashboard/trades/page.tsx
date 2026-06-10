"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { tradeApi } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@/components/ui/table";
import type { Trade, PlaceOrderRequest, TradeSide, TradeType } from "@/types";

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

const MOCK_TRADES: Trade[] = [
  {
    orderId: "ord-001",
    symbol: "RELIANCE",
    side: "BUY",
    type: "MARKET",
    quantity: 10,
    price: 2450.0,
    status: "EXECUTED",
    createdAt: "2025-05-20T10:30:00Z",
  },
  {
    orderId: "ord-002",
    symbol: "TCS",
    side: "SELL",
    type: "LIMIT",
    quantity: 5,
    price: 3800.0,
    status: "PENDING",
    createdAt: "2025-05-22T14:15:00Z",
  },
  {
    orderId: "ord-003",
    symbol: "INFY",
    side: "BUY",
    type: "MARKET",
    quantity: 20,
    price: 1500.0,
    status: "EXECUTED",
    createdAt: "2025-05-25T09:00:00Z",
  },
  {
    orderId: "ord-004",
    symbol: "HDFC",
    side: "BUY",
    type: "LIMIT",
    quantity: 8,
    price: 1600.0,
    status: "CANCELLED",
    createdAt: "2025-05-28T11:45:00Z",
  },
];

const orderSchema = z
  .object({
    symbol: z.string().min(1, "Symbol is required").toUpperCase(),
    side: z.enum(["BUY", "SELL"]),
    type: z.enum(["MARKET", "LIMIT"]),
    quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
    price: z.coerce.number().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "LIMIT" && (!data.price || data.price <= 0)) {
        return false;
      }
      return true;
    },
    { message: "Price is required for LIMIT orders", path: ["price"] }
  );

type OrderFormValues = z.infer<typeof orderSchema>;

function tradeSideBadge(side: string) {
  return side === "BUY" ? (
    <Badge variant="success">BUY</Badge>
  ) : (
    <Badge variant="danger">SELL</Badge>
  );
}

function tradeStatusBadge(status: string) {
  const map: Record<string, "success" | "warning" | "danger" | "secondary"> = {
    EXECUTED: "success",
    PENDING: "warning",
    CANCELLED: "secondary",
    REJECTED: "danger",
  };
  return <Badge variant={map[status] ?? "default"}>{status}</Badge>;
}

export default function TradesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const { data: trades, isLoading } = useQuery<Trade[]>({
    queryKey: ["trades"],
    queryFn: async () => {
      const res = await tradeApi.get("/trades?size=50&sort=createdAt,desc");
      return res.data?.content ?? res.data;
    },
    placeholderData: MOCK_TRADES,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { side: "BUY", type: "MARKET" },
  });

  const side = watch("side");
  const type = watch("type");

  const placeMutation = useMutation({
    mutationFn: (payload: PlaceOrderRequest) =>
      tradeApi.post("/trades", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      setFormSuccess("Order placed successfully!");
      setFormError(null);
      reset();
      setTimeout(() => {
        setShowForm(false);
        setFormSuccess(null);
      }, 1500);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to place order";
      setFormError(msg);
    },
  });

  const onSubmit = (values: OrderFormValues) => {
    setFormError(null);
    placeMutation.mutate({
      symbol: values.symbol,
      side: values.side as TradeSide,
      type: values.type as TradeType,
      quantity: values.quantity,
      price: values.type === "LIMIT" ? values.price : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Trades</h2>
          <p className="text-sm text-muted-foreground">Order history and new orders</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? (
            <>
              <X className="h-4 w-4" /> Cancel
            </>
          ) : (
            "Place Order"
          )}
        </Button>
      </div>

      {/* Place Order Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Order</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              <Input
                label="Symbol"
                id="symbol"
                placeholder="RELIANCE"
                {...register("symbol")}
                error={errors.symbol?.message}
              />

              {/* Side toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground/80">
                  Side
                </label>
                <div className="flex rounded-lg overflow-hidden border border-input">
                  <button
                    type="button"
                    onClick={() => setValue("side", "BUY")}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                      side === "BUY"
                        ? "bg-green-500 text-white"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("side", "SELL")}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                      side === "SELL"
                        ? "bg-red-500 text-white"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    SELL
                  </button>
                </div>
              </div>

              {/* Type toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground/80">
                  Order Type
                </label>
                <div className="flex rounded-lg overflow-hidden border border-input">
                  <button
                    type="button"
                    onClick={() => setValue("type", "MARKET")}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                      type === "MARKET"
                        ? "bg-primary text-white"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    MARKET
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue("type", "LIMIT")}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                      type === "LIMIT"
                        ? "bg-primary text-white"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    LIMIT
                  </button>
                </div>
              </div>

              <Input
                label="Quantity"
                id="quantity"
                type="number"
                min={1}
                placeholder="1"
                {...register("quantity")}
                error={errors.quantity?.message}
              />

              {type === "LIMIT" && (
                <Input
                  label="Limit Price (₹)"
                  id="price"
                  type="number"
                  min={0.01}
                  step="0.01"
                  placeholder="0.00"
                  prefix="₹"
                  {...register("price")}
                  error={errors.price?.message}
                />
              )}

              {/* Errors & success */}
              {formError && (
                <div className="col-span-full rounded-lg bg-red-500/10 px-3 py-2 text-sm text-loss">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="col-span-full rounded-lg bg-green-500/10 px-3 py-2 text-sm text-profit">
                  {formSuccess}
                </div>
              )}

              <div className="col-span-full">
                <Button
                  type="submit"
                  loading={placeMutation.isPending}
                  className={
                    side === "BUY"
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-red-500 hover:bg-red-600"
                  }
                >
                  {side === "BUY" ? "Place Buy Order" : "Place Sell Order"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Trade History */}
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-input border-t-indigo-500" />
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Order ID</TableHeader>
                  <TableHeader>Symbol</TableHeader>
                  <TableHeader>Side</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader className="text-right">Qty</TableHeader>
                  <TableHeader className="text-right">Price</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Date</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(trades ?? []).map((trade) => (
                  <TableRow key={trade.orderId}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {trade.orderId.slice(0, 12)}…
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {trade.symbol}
                    </TableCell>
                    <TableCell>{tradeSideBadge(trade.side)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{trade.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{trade.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatINR(trade.price)}
                    </TableCell>
                    <TableCell>{tradeStatusBadge(trade.status)}</TableCell>
                    <TableCell>
                      {new Date(trade.createdAt).toLocaleDateString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
