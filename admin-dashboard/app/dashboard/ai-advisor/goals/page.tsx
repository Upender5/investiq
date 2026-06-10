"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Target, Home, GraduationCap, Shield, Car, Plane,
  Heart, Sparkles, Plus, Brain, TrendingUp, Calendar,
  CheckCircle2, AlertTriangle, Trash2,
} from "lucide-react";
import { useGoals, useCreateGoal, useDeleteGoal, useGoalSimulation } from "@/lib/hooks";
import { formatCompactINR } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/ui/modal";
import type { Goal, GoalType } from "@/types";

const GOAL_META: Record<GoalType, { icon: React.ElementType; color: string; bg: string }> = {
  RETIREMENT: { icon: Target, color: "text-ai", bg: "bg-ai/10" },
  HOUSE: { icon: Home, color: "text-info", bg: "bg-blue-500/10" },
  EDUCATION: { icon: GraduationCap, color: "text-warning", bg: "bg-yellow-500/10" },
  EMERGENCY: { icon: Shield, color: "text-profit", bg: "bg-green-500/10" },
  CAR: { icon: Car, color: "text-warning", bg: "bg-orange-500/10" },
  TRAVEL: { icon: Plane, color: "text-info", bg: "bg-cyan-500/10" },
  MARRIAGE: { icon: Heart, color: "text-loss", bg: "bg-pink-500/10" },
  CUSTOM: { icon: Sparkles, color: "text-muted-foreground", bg: "bg-muted" },
};

const GOAL_TYPES: { type: GoalType; label: string }[] = [
  { type: "RETIREMENT", label: "Retirement" },
  { type: "HOUSE", label: "House Purchase" },
  { type: "EDUCATION", label: "Child Education" },
  { type: "EMERGENCY", label: "Emergency Fund" },
  { type: "CAR", label: "Car" },
  { type: "TRAVEL", label: "Travel" },
  { type: "MARRIAGE", label: "Marriage" },
  { type: "CUSTOM", label: "Custom Goal" },
];

function yearsLeft(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.round(diff / (365.25 * 24 * 3600 * 1000)));
}

export default function GoalPlannerPage() {
  const qc = useQueryClient();
  const { data: goals = [] } = useGoals();
  const createGoal = useCreateGoal();
  const deleteGoal = useDeleteGoal();
  const simulate = useGoalSimulation();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    type: "RETIREMENT" as GoalType,
    name: "",
    targetAmount: "",
    targetDate: "",
    currentAmount: "",
  });

  function buildLocalGoal(): Goal {
    const target = Number(newGoal.targetAmount);
    const current = Number(newGoal.currentAmount || 0);
    const targetDate = newGoal.targetDate || "2035-01-01";
    const years = Math.max(1, yearsLeft(targetDate));
    return {
      id: `local-${Date.now()}`,
      type: newGoal.type,
      name: newGoal.name,
      targetAmount: target,
      currentAmount: current,
      targetDate,
      monthlyRequired: Math.round((target - current) / (years * 12)),
      assetAllocation: { equity: 70, debt: 25, gold: 5 },
      onTrack: true,
      progressPercent: target > 0 ? (current / target) * 100 : 0,
    };
  }

  async function addGoal() {
    if (!newGoal.name || !newGoal.targetAmount) return;
    const localGoal = buildLocalGoal();
    const payload = {
      type: newGoal.type,
      name: newGoal.name,
      targetAmount: localGoal.targetAmount,
      currentAmount: localGoal.currentAmount,
      targetDate: localGoal.targetDate,
    };
    setShowAddModal(false);
    setNewGoal({ type: "RETIREMENT", name: "", targetAmount: "", targetDate: "", currentAmount: "" });

    try {
      // POST /api/v1/goals (user-service); AI simulation enriches the plan
      const created = await createGoal.mutateAsync(payload);
      simulate.mutate({
        goal_type: payload.type,
        target_amount: payload.targetAmount,
        current_amount: payload.currentAmount,
        target_date: payload.targetDate,
      });
      if (!created) throw new Error("empty response");
    } catch {
      // Offline fallback: keep the goal locally so the planner still works
      qc.setQueryData<Goal[]>(["goals"], (old = []) => [...old, localGoal]);
    }
  }

  function removeGoal(id: string) {
    // Optimistic removal; server delete for non-local goals
    qc.setQueryData<Goal[]>(["goals"], (old = []) => old.filter((g) => g.id !== id));
    if (!id.startsWith("local-")) deleteGoal.mutate(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Target className="h-6 w-6 text-ai" /> Goal Planner
          </h2>
          <p className="text-sm text-muted-foreground">AI-powered life goals with automated investment plans</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Goal
        </Button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Goals", value: goals.length, color: "text-foreground" },
          { label: "On Track", value: goals.filter((g) => g.onTrack).length, color: "text-profit" },
          { label: "Monthly Required", value: `₹${goals.reduce((s, g) => s + g.monthlyRequired, 0).toLocaleString("en-IN")}`, color: "text-ai" },
          { label: "Total Target", value: formatCompactINR(goals.reduce((s, g) => s + g.targetAmount, 0)), color: "text-foreground" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="py-4">
            <p className="text-xs text-muted-foreground/80">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Goal Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {goals.map((goal) => {
          const meta = GOAL_META[goal.type] ?? GOAL_META.CUSTOM;
          const Icon = meta.icon;
          const years = yearsLeft(goal.targetDate);
          const progressColor = goal.onTrack ? "bg-green-500" : "bg-yellow-500";

          return (
            <Card key={goal.id} className="hover:border-muted-foreground/40 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${meta.bg}`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{goal.name}</h3>
                    <p className="text-xs text-muted-foreground/80">{years} years to go · {new Date(goal.targetDate).getFullYear()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={goal.onTrack ? "success" : "warning"}>
                    {goal.onTrack ? <CheckCircle2 className="h-3 w-3 mr-1 inline" /> : <AlertTriangle className="h-3 w-3 mr-1 inline" />}
                    {goal.onTrack ? "On Track" : "Off Track"}
                  </Badge>
                  <button
                    className="ml-1 rounded p-1 text-muted-foreground/80 hover:text-loss transition-colors"
                    onClick={() => removeGoal(goal.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{formatCompactINR(goal.currentAmount)} saved</span>
                  <span>{goal.progressPercent.toFixed(1)}% of {formatCompactINR(goal.targetAmount)}</span>
                </div>
                <Progress value={goal.progressPercent} color={progressColor} size="md" />
              </div>

              {/* Monthly SIP */}
              <div className="rounded-lg bg-secondary/40 px-3 py-2.5 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-ai" />
                    <span className="text-xs text-muted-foreground">AI Recommended SIP</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">₹{goal.monthlyRequired.toLocaleString("en-IN")}/month</span>
                </div>
              </div>

              {/* Allocation */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Equity", value: goal.assetAllocation.equity, color: "bg-primary" },
                  { label: "Debt", value: goal.assetAllocation.debt, color: "bg-blue-500" },
                  { label: "Gold", value: goal.assetAllocation.gold, color: "bg-yellow-500" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg bg-card/60 border border-border/70 px-2 py-2 text-center">
                    <div className={`mx-auto mb-1 h-1.5 w-8 rounded-full ${color}`} />
                    <p className="text-xs font-semibold text-foreground">{value}%</p>
                    <p className="text-[10px] text-muted-foreground/80">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="ai" className="flex-1">
                  <TrendingUp className="h-3.5 w-3.5 mr-1" /> Start SIP
                </Button>
                <Button size="sm" variant="ghost">
                  <Calendar className="h-3.5 w-3.5 mr-1" /> Projections
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Goal Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Goal" size="md">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground/80">Goal Type</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {GOAL_TYPES.map(({ type, label }) => {
                const meta = GOAL_META[type];
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setNewGoal((p) => ({ ...p, type }))}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs transition-colors ${newGoal.type === type ? "border-ai bg-ai/10 text-ai" : "border-border text-muted-foreground hover:border-muted-foreground/40"}`}
                  >
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                    <span>{label.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground/80">Goal Name</label>
            <input
              type="text"
              value={newGoal.name}
              onChange={(e) => setNewGoal((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Buy a house in Hyderabad"
              className="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground/80">Target Amount (₹)</label>
              <input
                type="number"
                value={newGoal.targetAmount}
                onChange={(e) => setNewGoal((p) => ({ ...p, targetAmount: e.target.value }))}
                placeholder="5000000"
                className="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground/80">Current Savings (₹)</label>
              <input
                type="number"
                value={newGoal.currentAmount}
                onChange={(e) => setNewGoal((p) => ({ ...p, currentAmount: e.target.value }))}
                placeholder="0"
                className="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground/80">Target Date</label>
            <input
              type="date"
              value={newGoal.targetDate}
              onChange={(e) => setNewGoal((p) => ({ ...p, targetDate: e.target.value }))}
              min={new Date().toISOString().split("T")[0]}
              className="mt-1.5 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="ai" className="flex-1" loading={createGoal.isPending} onClick={addGoal}>
              <Brain className="h-4 w-4 mr-1" /> Generate AI Plan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
