package com.investiq.user.dto.request;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.List;

public record RiskProfileRequest(
    @NotNull @Min(1) @Max(10) Integer investmentHorizonYears,
    @NotBlank String primaryGoal,                   // WEALTH_GROWTH | REGULAR_INCOME | CAPITAL_PRESERVATION
    @NotNull @DecimalMin("0") BigDecimal monthlyInvestableIncome,
    @NotBlank String reactionToLoss,                // SELL_ALL | HOLD | BUY_MORE
    @NotNull @Min(1) @Max(10) Integer financialKnowledge,
    List<String> existingInvestments,               // FD, MF, STOCKS, GOLD, REAL_ESTATE
    @NotBlank String dependents                     // NONE | ONE_TWO | THREE_PLUS
) {}
