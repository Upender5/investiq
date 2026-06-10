package com.investiq.user.service;

import com.investiq.user.dto.request.GoalRequest;
import com.investiq.user.dto.response.GoalResponse;

import java.util.List;
import java.util.UUID;

public interface GoalService {
    List<GoalResponse> listGoals(UUID userId);
    GoalResponse createGoal(UUID userId, GoalRequest request);
    GoalResponse getGoal(UUID userId, UUID goalId);
    GoalResponse updateGoal(UUID userId, UUID goalId, GoalRequest request);
    void deleteGoal(UUID userId, UUID goalId);
}
