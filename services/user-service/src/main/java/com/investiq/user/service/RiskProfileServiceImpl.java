package com.investiq.user.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.investiq.user.domain.entity.UserRiskProfile;
import com.investiq.user.domain.repository.UserRiskProfileRepository;
import com.investiq.user.dto.request.RiskProfileRequest;
import com.investiq.user.dto.response.RiskProfileResponse;
import com.investiq.user.exception.UserNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RiskProfileServiceImpl implements RiskProfileService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final UserRiskProfileRepository profileRepository;

    @Override
    public RiskProfileResponse getProfile(UUID userId) {
        UserRiskProfile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("Risk profile not found. Please complete the assessment."));
        return toResponse(profile);
    }

    @Override
    @Transactional
    public RiskProfileResponse assess(UUID userId, RiskProfileRequest request) {
        int score = computeScore(request);
        String category = resolveCategory(score);
        String existingJson = serializeList(request.existingInvestments());

        UserRiskProfile profile = profileRepository.findByUserId(userId)
                .orElse(UserRiskProfile.builder().userId(userId).build());
        profile.setRiskScore(score);
        profile.setRiskCategory(category);
        profile.setInvestmentHorizonYears(request.investmentHorizonYears());
        profile.setPrimaryGoal(request.primaryGoal());
        profile.setMonthlyInvestableIncome(request.monthlyInvestableIncome());
        profile.setReactionToLoss(request.reactionToLoss());
        profile.setFinancialKnowledge(request.financialKnowledge());
        profile.setExistingInvestments(existingJson);
        profile.setDependents(request.dependents());
        profile.setAssessedAt(Instant.now());
        return toResponse(profileRepository.save(profile));
    }

    // ── Scoring logic ─────────────────────────────────────────────────────────

    private int computeScore(RiskProfileRequest r) {
        int score = 0;

        // Horizon: longer = more risk capacity
        score += Math.min(r.investmentHorizonYears() * 3, 25);

        // Goal type
        score += switch (r.primaryGoal()) {
            case "WEALTH_GROWTH"       -> 20;
            case "REGULAR_INCOME"      -> 10;
            case "CAPITAL_PRESERVATION" -> 5;
            default -> 10;
        };

        // Reaction to loss
        score += switch (r.reactionToLoss()) {
            case "BUY_MORE"  -> 25;
            case "HOLD"      -> 15;
            case "SELL_ALL"  -> 5;
            default -> 10;
        };

        // Financial knowledge
        score += r.financialKnowledge() * 2;

        // Dependents (fewer = more risk capacity)
        score += switch (r.dependents()) {
            case "NONE"      -> 10;
            case "ONE_TWO"   -> 5;
            case "THREE_PLUS" -> 0;
            default -> 5;
        };

        return Math.min(score, 100);
    }

    private String resolveCategory(int score) {
        if (score >= 75) return "VERY_AGGRESSIVE";
        if (score >= 55) return "AGGRESSIVE";
        if (score >= 35) return "MODERATE";
        return "CONSERVATIVE";
    }

    private RiskProfileResponse toResponse(UserRiskProfile p) {
        List<String> assetClasses = recommendedAssets(p.getRiskCategory());
        List<RiskProfileResponse.AllocationSuggestion> allocation = suggestedAllocation(p.getRiskCategory());
        return new RiskProfileResponse(p.getUserId(), p.getRiskCategory(), p.getRiskScore(),
                p.getInvestmentHorizonYears(), p.getPrimaryGoal(), p.getMonthlyInvestableIncome(),
                assetClasses, allocation, p.getAssessedAt());
    }

    private List<String> recommendedAssets(String category) {
        return switch (category) {
            case "VERY_AGGRESSIVE" -> List.of("SMALL_CAP_EQUITY", "MID_CAP_EQUITY", "SECTOR_FUNDS", "INTERNATIONAL_EQUITY");
            case "AGGRESSIVE"      -> List.of("LARGE_CAP_EQUITY", "MID_CAP_EQUITY", "FLEXI_CAP_FUNDS");
            case "MODERATE"        -> List.of("LARGE_CAP_EQUITY", "BALANCED_FUNDS", "CORPORATE_BONDS");
            default                -> List.of("LIQUID_FUNDS", "SHORT_DURATION_DEBT", "FD", "GOVERNMENT_BONDS");
        };
    }

    private List<RiskProfileResponse.AllocationSuggestion> suggestedAllocation(String category) {
        return switch (category) {
            case "VERY_AGGRESSIVE" -> List.of(
                    new RiskProfileResponse.AllocationSuggestion("EQUITY", 85),
                    new RiskProfileResponse.AllocationSuggestion("DEBT", 10),
                    new RiskProfileResponse.AllocationSuggestion("GOLD", 5));
            case "AGGRESSIVE"      -> List.of(
                    new RiskProfileResponse.AllocationSuggestion("EQUITY", 70),
                    new RiskProfileResponse.AllocationSuggestion("DEBT", 20),
                    new RiskProfileResponse.AllocationSuggestion("GOLD", 10));
            case "MODERATE"        -> List.of(
                    new RiskProfileResponse.AllocationSuggestion("EQUITY", 50),
                    new RiskProfileResponse.AllocationSuggestion("DEBT", 40),
                    new RiskProfileResponse.AllocationSuggestion("GOLD", 10));
            default                -> List.of(
                    new RiskProfileResponse.AllocationSuggestion("EQUITY", 20),
                    new RiskProfileResponse.AllocationSuggestion("DEBT", 70),
                    new RiskProfileResponse.AllocationSuggestion("GOLD", 10));
        };
    }

    private String serializeList(List<String> list) {
        if (list == null || list.isEmpty()) return null;
        try {
            return MAPPER.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
