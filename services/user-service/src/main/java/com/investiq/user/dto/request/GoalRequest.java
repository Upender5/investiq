package com.investiq.user.dto.request;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record GoalRequest(
    @NotBlank @Size(min = 2, max = 100) String name,
    @NotBlank String goalType,          // EMERGENCY_FUND | EDUCATION | HOUSE | CAR | RETIREMENT | VACATION | CUSTOM
    @NotNull @DecimalMin("1") BigDecimal targetAmount,
    @NotNull @Future LocalDate targetDate,
    @DecimalMin("0") BigDecimal currentSavings,
    @DecimalMin("0") BigDecimal monthlyContribution,
    String icon,
    String color
) {}
