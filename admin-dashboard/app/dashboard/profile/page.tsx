"use client";

import { useState } from "react";
import {
  Shield, Smartphone, Lock,
  CheckCircle2, AlertTriangle, Edit2, Building2, Plus,
  LogOut, Star,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useProfile,
  usePortfolioAnalytics,
  useBankAccounts,
  useRemoveBankAccount,
  useDevices,
  useRevokeDevice,
  useNotificationSettings,
  useUpdateNotificationSettings,
} from "@/lib/hooks";
import { clearTokens } from "@/lib/auth";
import { formatINR, formatDate } from "@/lib/format";
import { useRouter } from "next/navigation";

// Static subscription tiers (product pricing — not user data). The user's *current*
// plan is not asserted because there is no subscription backend yet.
const PLAN_TIERS = [
  { name: "Starter", price: "Free", features: ["Basic trading", "5 watchlists", "Basic charts", "Community access"] },
  { name: "Pro", price: "₹199/mo", features: ["Unlimited trading", "AI Copilot Chat", "Portfolio Health", "Goal Planner", "AI Screener", "Priority support"] },
  { name: "Elite", price: "₹999/mo", features: ["Everything in Pro", "AI Portfolio Manager", "Tax AI", "RM Access", "Basket orders", "White-glove support"] },
];

const NOTIFICATION_CHANNELS: { key: "pushEnabled" | "emailEnabled" | "smsEnabled" | "whatsappEnabled"; label: string; desc: string }[] = [
  { key: "pushEnabled", label: "Push Notifications", desc: "Order fills, price alerts and portfolio updates on your device" },
  { key: "emailEnabled", label: "Email", desc: "Statements, summaries and important account notices" },
  { key: "smsEnabled", label: "SMS", desc: "OTPs and critical transaction alerts" },
  { key: "whatsappEnabled", label: "WhatsApp", desc: "Opt-in updates via WhatsApp" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState("profile");

  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: portfolio } = usePortfolioAnalytics();
  const summary = portfolio?.summary;
  const { data: banks } = useBankAccounts();
  const removeBank = useRemoveBankAccount();
  const { data: devices } = useDevices();
  const revokeDevice = useRevokeDevice();
  const { data: settings } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();

  const bankAccounts = banks ?? [];
  const trustedDevices = devices ?? [];

  function toggleChannel(key: "pushEnabled" | "emailEnabled" | "smsEnabled" | "whatsappEnabled") {
    if (!settings) return;
    updateSettings.mutate({ [key]: !settings[key] });
  }

  function handleLogout() {
    clearTokens();
    router.replace("/login");
  }

  const kyc = profile?.kycStatus ?? "PENDING";
  const initial = profile?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-white flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground">
              {profile?.name ?? (profileLoading ? "Loading…" : "—")}
            </h2>
            <Badge variant={kyc === "VERIFIED" ? "success" : "warning"}>
              {kyc === "VERIFIED" ? <CheckCircle2 className="h-3 w-3 mr-1 inline" /> : <AlertTriangle className="h-3 w-3 mr-1 inline" />}
              KYC {kyc}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {[profile?.email, profile?.phone].filter(Boolean).join(" · ") || "—"}
          </p>
          {profile?.createdAt && (
            <p className="text-xs text-muted-foreground/80 mt-0.5">Member since {formatDate(profile.createdAt)}</p>
          )}
        </div>
        <Button variant="secondary" size="sm">
          <Edit2 className="h-4 w-4 mr-1" /> Edit Profile
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {[
            { value: "profile", label: "Profile" },
            { value: "security", label: "Security" },
            { value: "banks", label: "Bank Accounts" },
            { value: "devices", label: "Devices" },
            { value: "notifications", label: "Notifications" },
            { value: "subscription", label: "Plans" },
          ].map(({ value, label }) => (
            <TabsTrigger key={value} value={value} activeValue={tab} onSelect={setTab}>{label}</TabsTrigger>
          ))}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" activeValue={tab}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Full Name", value: profile?.name ?? "—" },
                  { label: "Email Address", value: profile?.email ?? "—" },
                  { label: "Mobile Number", value: profile?.phone ?? "—" },
                  { label: "KYC Status", value: kyc, isKyc: true },
                ].map(({ label, value, isKyc }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className={`text-sm font-medium ${isKyc && value === "VERIFIED" ? "text-profit" : "text-foreground"}`}>{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Portfolio Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {summary ? (
                  [
                    { label: "Portfolio Value", value: formatINR(summary.totalValue) },
                    { label: "Total Invested", value: formatINR(summary.totalInvested) },
                    { label: "Total P&L", value: `${summary.totalPnl >= 0 ? "+" : ""}${formatINR(summary.totalPnl)}`, positive: summary.totalPnl >= 0 },
                    { label: "Active Positions", value: String(summary.activePositions) },
                  ].map(({ label, value, positive }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className={`text-sm font-medium ${positive ? "text-profit" : "text-foreground"}`}>{value}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground/70">No portfolio data yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" activeValue={tab}>
          <div className="space-y-4">
            {[
              { title: "Change Password", desc: "Update your account password", icon: Lock, action: "Update" },
              { title: "MPIN", desc: "6-digit PIN for quick app access and order confirmation", icon: Shield, action: "Change MPIN" },
              { title: "Two-Factor Authentication", desc: "OTP / TOTP for every login", icon: Smartphone, action: "Manage" },
              { title: "Active Sessions", desc: "Manage devices where you're logged in", icon: Smartphone, action: "Manage" },
            ].map(({ title, desc, icon: Icon, action }) => (
              <Card key={title}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/60">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground/80">{desc}</p>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm">{action}</Button>
                </div>
              </Card>
            ))}

            <div className="pt-2">
              <Button variant="danger" onClick={handleLogout} className="w-full sm:w-auto">
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Bank Accounts Tab */}
        <TabsContent value="banks" activeValue={tab}>
          <div className="space-y-4">
            {bankAccounts.length === 0 && (
              <Card className="py-10 text-center text-muted-foreground/80">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No bank accounts linked yet.</p>
              </Card>
            )}
            {bankAccounts.map((account) => (
              <Card key={account.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                      <Building2 className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{account.bankName ?? account.bank ?? "Bank"}</p>
                        {account.primary && <Badge variant="success">Primary</Badge>}
                        {account.verified && <Badge variant="info">Verified</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{account.accountNumber} · IFSC: {account.ifsc}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-loss hover:text-loss"
                      loading={removeBank.isPending}
                      onClick={() => removeBank.mutate(account.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            <Button variant="secondary" className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Add Bank Account
            </Button>
          </div>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" activeValue={tab}>
          <div className="space-y-3">
            {trustedDevices.length === 0 && (
              <Card className="py-10 text-center text-muted-foreground/80">
                <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No registered devices.</p>
              </Card>
            )}
            {trustedDevices.map((device) => (
              <Card key={device.id ?? device.deviceId}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/60">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{device.name ?? device.deviceName ?? "Device"}</p>
                        {device.current && <Badge variant="success">This device</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground/80">
                        {[device.location, device.lastActive ?? (device.lastSeenAt ? formatDate(device.lastSeenAt) : null)]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                  </div>
                  {!device.current && (
                    <Button
                      variant="danger"
                      size="sm"
                      loading={revokeDevice.isPending}
                      onClick={() => revokeDevice.mutate((device.deviceId ?? device.id) as string)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" activeValue={tab}>
          <Card>
            <CardHeader><CardTitle>Notification Channels</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!settings ? (
                <p className="text-sm text-muted-foreground/70">Loading preferences…</p>
              ) : (
                NOTIFICATION_CHANNELS.map(({ key, label, desc }) => {
                  const on = !!settings[key];
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground/80">{desc}</p>
                      </div>
                      <button
                        disabled={updateSettings.isPending}
                        onClick={() => toggleChannel(key)}
                        className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-60 ${on ? "bg-primary" : "bg-secondary"}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-5" : "left-0.5"}`} />
                      </button>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" activeValue={tab}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PLAN_TIERS.map((plan) => (
              <Card key={plan.name} className="relative">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    {plan.name === "Pro" && <Star className="h-4 w-4 text-yellow-400" />}
                    {plan.name}
                  </h3>
                  <p className="text-2xl font-bold text-primary mt-1">{plan.price}</p>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="h-4 w-4 text-profit flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant="primary">
                  Choose {plan.name}
                </Button>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground/70">
            Subscription management is not yet available — plan selection will be enabled once billing is live.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
