package com.investiq.user.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record RiskProfileResponse(
    UUID userId,
    String riskCategory,          // CONSERVATIVE | MODERATE | AGGRESSIVE | VERY_AGGRESSIVE
    int riskScore,                // 1–100
    int investmentHorizonYears,
    String primaryGoal,
    BigDecimal monthlyInvestableIncome,
    List<String> recommendedAssetClasses,
    List<AllocationSuggestion> suggestedAllocation,
    Instant assessedAt
) {
    public record AllocationSuggestion(String assetClass, int percentage) {}
}
