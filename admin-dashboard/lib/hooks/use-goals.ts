"use client";

/** Hooks for goals (user-service port 8082, /api/v1/goals) + AI goal planner (port 9001). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiAdvisorApi, goalsApi, unwrap } from "@/lib/api";
import type { Goal, GoalType } from "@/types";

export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: async () => unwrap(await goalsApi.get("/goals")),
    placeholderData: [],
  });
}

export function useGoal(id: string) {
  return useQuery<Goal>({
    queryKey: ["goals", id],
    queryFn: async () => unwrap(await goalsApi.get(`/goals/${id}`)),
    enabled: !!id,
  });
}

export interface CreateGoalRequest {
  type: GoalType;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateGoalRequest) =>
      unwrap<Goal>(await goalsApi.post("/goals", payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreateGoalRequest> & { id: string }) =>
      unwrap<Goal>(await goalsApi.put(`/goals/${id}`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsApi.delete(`/goals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

/** AI plan for a specific goal — GET /api/v1/ai/goals/{id}/recommendation */
export function useGoalAiPlan(goalId: string | null) {
  return useQuery({
    queryKey: ["goals", "ai-plan", goalId],
    queryFn: async () =>
      unwrap(await aiAdvisorApi.get(`/api/v1/ai/goals/${goalId}/recommendation`)),
    enabled: !!goalId,
  });
}

export interface GoalSimulationRequest {
  goal_type: GoalType;
  target_amount: number;
  current_amount: number;
  target_date: string;
  risk_profile?: string;
}

/** Goal simulation + instrument recommendations — POST /api/v1/ai/goal-planner */
export function useGoalSimulation() {
  return useMutation({
    mutationFn: async (payload: GoalSimulationRequest) =>
      unwrap(await aiAdvisorApi.post("/api/v1/ai/goal-planner", payload)),
  });
}
