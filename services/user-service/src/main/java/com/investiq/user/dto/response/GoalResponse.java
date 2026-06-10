package com.investiq.user.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record GoalResponse(
    UUID id,
    String name,
    String goalType,
    BigDecimal targetAmount,
    LocalDate targetDate,
    BigDecimal currentSavings,
    BigDecimal monthlyContribution,
    BigDecimal progressPercent,
    int remainingMonths,
    String status,              // ON_TRACK | AT_RISK | ACHIEVED
    String icon,
    String color,
    Instant createdAt,
    Instant updatedAt
) {}
