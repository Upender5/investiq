package com.investiq.user.service;

import com.investiq.user.domain.entity.UserGoal;
import com.investiq.user.domain.repository.UserGoalRepository;
import com.investiq.user.dto.request.GoalRequest;
import com.investiq.user.dto.response.GoalResponse;
import com.investiq.user.exception.UserNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GoalServiceImpl implements GoalService {

    private final UserGoalRepository goalRepository;

    @Override
    public List<GoalResponse> listGoals(UUID userId) {
        return goalRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public GoalResponse createGoal(UUID userId, GoalRequest request) {
        UserGoal goal = UserGoal.builder()
                .userId(userId)
                .name(request.name())
                .goalType(request.goalType())
                .targetAmount(request.targetAmount())
                .targetDate(request.targetDate())
                .currentSavings(request.currentSavings() != null ? request.currentSavings() : BigDecimal.ZERO)
                .monthlyContribution(request.monthlyContribution() != null ? request.monthlyContribution() : BigDecimal.ZERO)
                .icon(request.icon())
                .color(request.color())
                .build();
        return toResponse(goalRepository.save(goal));
    }

    @Override
    public GoalResponse getGoal(UUID userId, UUID goalId) {
        return goalRepository.findByIdAndUserId(goalId, userId)
                .map(this::toResponse)
                .orElseThrow(() -> new UserNotFoundException("Goal not found"));
    }

    @Override
    @Transactional
    public GoalResponse updateGoal(UUID userId, UUID goalId, GoalRequest request) {
        UserGoal goal = goalRepository.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new UserNotFoundException("Goal not found"));
        goal.setName(request.name());
        goal.setGoalType(request.goalType());
        goal.setTargetAmount(request.targetAmount());
        goal.setTargetDate(request.targetDate());
        if (request.currentSavings() != null) goal.setCurrentSavings(request.currentSavings());
        if (request.monthlyContribution() != null) goal.setMonthlyContribution(request.monthlyContribution());
        if (request.icon() != null) goal.setIcon(request.icon());
        if (request.color() != null) goal.setColor(request.color());
        return toResponse(goalRepository.save(goal));
    }

    @Override
    @Transactional
    public void deleteGoal(UUID userId, UUID goalId) {
        UserGoal goal = goalRepository.findByIdAndUserId(goalId, userId)
                .orElseThrow(() -> new UserNotFoundException("Goal not found"));
        goalRepository.delete(goal);
    }

    private GoalResponse toResponse(UserGoal g) {
        BigDecimal progress = BigDecimal.ZERO;
        if (g.getTargetAmount().compareTo(BigDecimal.ZERO) > 0) {
            progress = g.getCurrentSavings()
                    .divide(g.getTargetAmount(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .min(BigDecimal.valueOf(100));
        }
        long remainingMonths = ChronoUnit.MONTHS.between(LocalDate.now(), g.getTargetDate());
        remainingMonths = Math.max(0, remainingMonths);

        String status;
        if (progress.compareTo(BigDecimal.valueOf(100)) >= 0) {
            status = "ACHIEVED";
        } else if (remainingMonths > 0) {
            BigDecimal needed = g.getTargetAmount().subtract(g.getCurrentSavings());
            BigDecimal projected = g.getMonthlyContribution().multiply(BigDecimal.valueOf(remainingMonths));
            status = projected.compareTo(needed) >= 0 ? "ON_TRACK" : "AT_RISK";
        } else {
            status = "AT_RISK";
        }

        return new GoalResponse(g.getId(), g.getName(), g.getGoalType(), g.getTargetAmount(),
                g.getTargetDate(), g.getCurrentSavings(), g.getMonthlyContribution(),
                progress, (int) remainingMonths, status, g.getIcon(), g.getColor(),
                g.getCreatedAt(), g.getUpdatedAt());
    }
}
