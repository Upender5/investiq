"use client";

import { useState } from "react";
import { Calendar, TrendingUp, TrendingDown, Info, ExternalLink, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { IPO } from "@/types";

// IPO data feed is not yet wired to a backend service — no fabricated listings.
const MOCK_IPOS: IPO[] = [];

function statusBadge(status: IPO["status"]) {
  if (status === "OPEN") return <Badge variant="success">OPEN</Badge>;
  if (status === "UPCOMING") return <Badge variant="info">UPCOMING</Badge>;
  if (status === "CLOSED") return <Badge variant="warning">CLOSED</Badge>;
  return <Badge variant="secondary">LISTED</Badge>;
}

function gmpTag(gmp: number) {
  if (gmp > 0) return <span className="text-profit font-semibold text-sm">+₹{gmp} ({((gmp / 430) * 100).toFixed(1)}%)</span>;
  if (gmp < 0) return <span className="text-loss font-semibold text-sm">-₹{Math.abs(gmp)}</span>;
  return <span className="text-muted-foreground/80 text-sm">—</span>;
}

function listingReturn(ipo: IPO) {
  if (!ipo.listingPrice) return null;
  const mid = (ipo.priceRangeLow + ipo.priceRangeHigh) / 2;
  const ret = ((ipo.listingPrice - mid) / mid) * 100;
  return (
    <span className={`font-semibold text-sm ${ret >= 0 ? "text-profit" : "text-loss"}`}>
      {ret >= 0 ? "+" : ""}{ret.toFixed(1)}% listing gain
    </span>
  );
}

export default function IPOPage() {
  const [tab, setTab] = useState("open");

  const open = MOCK_IPOS.filter((i) => i.status === "OPEN");
  const upcoming = MOCK_IPOS.filter((i) => i.status === "UPCOMING");
  const listed = MOCK_IPOS.filter((i) => i.status === "LISTED" || i.status === "CLOSED");

  const tabData: Record<string, IPO[]> = { open, upcoming, listed };
  const counts: Record<string, number> = { open: open.length, upcoming: upcoming.length, listed: listed.length };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">IPO</h2>
        <p className="text-sm text-muted-foreground">Subscribe to upcoming IPOs and track allotment status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Open for Subscription", value: open.length, color: "text-profit", icon: CheckCircle2 },
          { label: "Upcoming IPOs", value: upcoming.length, color: "text-blue-400", icon: Clock },
          { label: "Recently Listed", value: listed.length, color: "text-muted-foreground", icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label} className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/60">
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground/80">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {[
            { value: "open", label: `Open (${counts.open})` },
            { value: "upcoming", label: `Upcoming (${counts.upcoming})` },
            { value: "listed", label: `Listed (${counts.listed})` },
          ].map(({ value, label }) => (
            <TabsTrigger key={value} value={value} activeValue={tab} onSelect={setTab}>{label}</TabsTrigger>
          ))}
        </TabsList>

        {(["open", "upcoming", "listed"] as const).map((t) => (
          <TabsContent key={t} value={t} activeValue={tab}>
            <div className="space-y-4">
              {tabData[t].length === 0 && (
                <Card className="py-12 text-center text-muted-foreground/80">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No IPOs to show here right now.</p>
                </Card>
              )}
              {tabData[t].map((ipo) => (
                <Card key={ipo.id} className="hover:border-muted-foreground/40 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-foreground">{ipo.companyName}</h3>
                        {statusBadge(ipo.status)}
                        <Badge variant="secondary">{ipo.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground/80 mb-3">{ipo.symbol} · {ipo.industry}</p>

                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground/80">Issue Size</span>
                          <span className="text-foreground">₹{ipo.issueSize} Cr</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground/80">Price Band</span>
                          <span className="text-foreground">₹{ipo.priceRangeLow}–₹{ipo.priceRangeHigh}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground/80">Lot Size</span>
                          <span className="text-foreground">{ipo.lotSize} shares</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground/80">Min Investment</span>
                          <span className="text-foreground">₹{(ipo.lotSize * ipo.priceRangeHigh).toLocaleString("en-IN")}</span>
                        </div>
                        {ipo.status === "OPEN" && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground/80">Subscribed</span>
                            <span className="text-profit font-semibold">{ipo.subscriptionTimes}x</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground/80">GMP</span>
                          {gmpTag(ipo.gmp)}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground/80">{ipo.status === "LISTED" ? "Listing Date" : ipo.status === "OPEN" ? "Closes" : "Opens"}</span>
                          <span className="text-foreground">{new Date(ipo.status === "LISTED" ? ipo.listingDate! : ipo.status === "OPEN" ? ipo.closeDate : ipo.openDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                        {ipo.listingPrice && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground/80">Listing Price</span>
                            <div className="text-right">
                              <span className="text-foreground">₹{ipo.listingPrice}</span>
                              <span className="ml-2">{listingReturn(ipo)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 min-w-36">
                      {ipo.status === "OPEN" && (
                        <Button className="bg-green-500 hover:bg-green-600 w-full">Apply Now</Button>
                      )}
                      {ipo.status === "UPCOMING" && (
                        <Button variant="secondary" className="w-full"><Calendar className="h-4 w-4 mr-1" /> Set Reminder</Button>
                      )}
                      {ipo.status === "LISTED" && (
                        <Button variant="secondary" className="w-full"><TrendingUp className="h-4 w-4 mr-1" /> Check Allotment</Button>
                      )}
                      <Button variant="ghost" size="sm" className="w-full">
                        <Info className="h-4 w-4 mr-1" /> View Details
                      </Button>
                    </div>
                  </div>

                  {ipo.status === "OPEN" && ipo.gmp > 50 && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-xs text-profit">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      Strong GMP of ₹{ipo.gmp} (+{((ipo.gmp / ipo.priceRangeHigh) * 100).toFixed(1)}%) suggests healthy listing. Already {ipo.subscriptionTimes}x subscribed.
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <p className="text-xs text-muted-foreground/80 text-center">GMP data is unofficial and may not reflect actual listing performance. IPO investments carry risk.</p>
    </div>
  );
}
