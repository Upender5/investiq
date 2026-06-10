package com.investiq.user.controller;

import com.investiq.user.dto.request.GoalRequest;
import com.investiq.user.dto.response.ApiResponse;
import com.investiq.user.dto.response.GoalResponse;
import com.investiq.user.security.AuthenticatedUser;
import com.investiq.user.service.GoalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/goals")
@RequiredArgsConstructor
@Tag(name = "Goal Planning", description = "Create and track personalised financial goals")
@SecurityRequirement(name = "bearerAuth")
public class GoalController {

    private final GoalService goalService;

    @GetMapping
    @Operation(summary = "List all financial goals with progress tracking")
    public ApiResponse<List<GoalResponse>> listGoals(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(goalService.listGoals(user.userId()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new financial goal")
    public ApiResponse<GoalResponse> createGoal(
            @Valid @RequestBody GoalRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(goalService.createGoal(user.userId(), request));
    }

    @GetMapping("/{goalId}")
    @Operation(summary = "Get a specific goal with progress and linked investments")
    public ApiResponse<GoalResponse> getGoal(
            @PathVariable UUID goalId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(goalService.getGoal(user.userId(), goalId));
    }

    @PutMapping("/{goalId}")
    @Operation(summary = "Update goal target, date or monthly contribution")
    public ApiResponse<GoalResponse> updateGoal(
            @PathVariable UUID goalId,
            @Valid @RequestBody GoalRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(goalService.updateGoal(user.userId(), goalId, request));
    }

    @DeleteMapping("/{goalId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a goal")
    public void deleteGoal(
            @PathVariable UUID goalId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        goalService.deleteGoal(user.userId(), goalId);
    }
}
