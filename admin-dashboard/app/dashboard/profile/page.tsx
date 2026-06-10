"use client";

import { useState } from "react";
import {
  User, Shield, CreditCard, Smartphone, Bell, Lock,
  CheckCircle2, AlertTriangle, Edit2, Building2, Plus,
  LogOut, ChevronRight, Star, IndianRupee,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { clearTokens } from "@/lib/auth";
import { useRouter } from "next/navigation";

const PROFILE = {
  name: "Upender Kumar",
  email: "upender@investiq.in",
  phone: "+91 98765 43210",
  kycStatus: "VERIFIED" as const,
  memberSince: "January 2025",
  plan: "Pro",
  panNumber: "ABCDE1234F",
  portfolioValue: 125430.5,
};

const DEVICES = [
  { id: "d1", name: "Chrome · Windows 11", location: "Hyderabad, IN", lastActive: "Active now", current: true },
  { id: "d2", name: "Safari · iPhone 15", location: "Hyderabad, IN", lastActive: "2 hours ago", current: false },
];

const BANK_ACCOUNTS = [
  { id: "b1", bank: "HDFC Bank", accountNumber: "XXXX XXXX 4521", ifsc: "HDFC0001234", primary: true, verified: true },
  { id: "b2", bank: "SBI", accountNumber: "XXXX XXXX 8834", ifsc: "SBIN0001234", primary: false, verified: true },
];

const PLANS = [
  { name: "Starter", price: "Free", features: ["Basic trading", "5 watchlists", "Basic charts", "Community access"], current: false },
  { name: "Pro", price: "₹199/mo", features: ["Unlimited trading", "AI Copilot Chat", "Portfolio Health", "Goal Planner", "AI Screener", "Priority support"], current: true },
  { name: "Elite", price: "₹999/mo", features: ["Everything in Pro", "AI Portfolio Manager", "Tax AI", "RM Access", "Basket orders", "White-glove support"], current: false },
];

export default function ProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState("profile");
  const [notifs, setNotifs] = useState({
    priceAlerts: true,
    news: true,
    portfolio: true,
    ai: true,
    sip: true,
    ipo: false,
  });

  function handleLogout() {
    clearTokens();
    router.replace("/login");
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-white flex-shrink-0">
          {PROFILE.name[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground">{PROFILE.name}</h2>
            <Badge variant={PROFILE.kycStatus === "VERIFIED" ? "success" : "warning"}>
              {PROFILE.kycStatus === "VERIFIED" ? <CheckCircle2 className="h-3 w-3 mr-1 inline" /> : <AlertTriangle className="h-3 w-3 mr-1 inline" />}
              KYC {PROFILE.kycStatus}
            </Badge>
            <Badge variant="info"><Star className="h-3 w-3 mr-1 inline" />{PROFILE.plan} Plan</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{PROFILE.email} · {PROFILE.phone}</p>
          <p className="text-xs text-muted-foreground/80 mt-0.5">Member since {PROFILE.memberSince}</p>
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
                  { label: "Full Name", value: PROFILE.name },
                  { label: "Email Address", value: PROFILE.email },
                  { label: "Mobile Number", value: PROFILE.phone },
                  { label: "PAN Number", value: PROFILE.panNumber },
                  { label: "KYC Status", value: PROFILE.kycStatus },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className={`text-sm font-medium ${label === "KYC Status" ? "text-profit" : "text-foreground"}`}>{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Portfolio Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Portfolio Value", value: "₹1,25,430.50" },
                  { label: "Total Invested", value: "₹1,07,110" },
                  { label: "Total P&L", value: "+₹18,320", positive: true },
                  { label: "Active Positions", value: "5" },
                  { label: "Total Trades", value: "47" },
                ].map(({ label, value, positive }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className={`text-sm font-medium ${positive ? "text-profit" : "text-foreground"}`}>{value}</span>
                  </div>
                ))}
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
              { title: "Two-Factor Authentication", desc: "OTP on mobile for every login", icon: Smartphone, action: "Enabled", enabled: true },
              { title: "Active Sessions", desc: "Manage devices where you're logged in", icon: Smartphone, action: "Manage" },
            ].map(({ title, desc, icon: Icon, action, enabled }) => (
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
                  {enabled ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Button variant="secondary" size="sm">{action}</Button>
                  )}
                </div>
              </Card>
            ))}

            <div className="pt-2">
              <Button variant="danger" onClick={handleLogout} className="w-full sm:w-auto">
                <LogOut className="h-4 w-4 mr-2" /> Sign Out from All Devices
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Bank Accounts Tab */}
        <TabsContent value="banks" activeValue={tab}>
          <div className="space-y-4">
            {BANK_ACCOUNTS.map((account) => (
              <Card key={account.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                      <Building2 className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{account.bank}</p>
                        {account.primary && <Badge variant="success">Primary</Badge>}
                        {account.verified && <Badge variant="info">Verified</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">{account.accountNumber} · IFSC: {account.ifsc}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!account.primary && <Button variant="ghost" size="sm">Set Primary</Button>}
                    <Button variant="ghost" size="sm" className="text-loss hover:text-loss">Remove</Button>
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
            {DEVICES.map((device) => (
              <Card key={device.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/60">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{device.name}</p>
                        {device.current && <Badge variant="success">This device</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground/80">{device.location} · {device.lastActive}</p>
                    </div>
                  </div>
                  {!device.current && (
                    <Button variant="danger" size="sm">Revoke</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" activeValue={tab}>
          <Card>
            <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(Object.keys(notifs) as (keyof typeof notifs)[]).map((key) => {
                const labels: Record<keyof typeof notifs, string> = {
                  priceAlerts: "Price Alerts",
                  news: "Market & Company News",
                  portfolio: "Portfolio Updates",
                  ai: "AI Recommendations",
                  sip: "SIP Reminders",
                  ipo: "IPO Notifications",
                };
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{labels[key]}</p>
                      <p className="text-xs text-muted-foreground/80">Push + Email</p>
                    </div>
                    <button
                      onClick={() => setNotifs((p) => ({ ...p, [key]: !p[key] }))}
                      className={`relative h-6 w-11 rounded-full transition-colors ${notifs[key] ? "bg-primary" : "bg-secondary"}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${notifs[key] ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" activeValue={tab}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.current ? "border-primary bg-primary/5" : ""}`}
              >
                {plan.current && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="info">Current Plan</Badge>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="text-2xl font-bold text-primary mt-1">{plan.price}</p>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="h-4 w-4 text-profit flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.current ? "secondary" : "primary"}
                  disabled={plan.current}
                >
                  {plan.current ? "Active" : `Upgrade to ${plan.name}`}
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
