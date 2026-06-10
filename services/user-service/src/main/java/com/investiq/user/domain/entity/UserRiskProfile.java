package com.investiq.user.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_risk_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRiskProfile {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "risk_score", nullable = false)
    private int riskScore;

    @Column(name = "risk_category", nullable = false, length = 20)
    private String riskCategory;

    @Column(name = "investment_horizon_years", nullable = false)
    private int investmentHorizonYears;

    @Column(name = "primary_goal", nullable = false, length = 30)
    private String primaryGoal;

    @Column(name = "monthly_investable_income", nullable = false, precision = 20, scale = 2)
    private BigDecimal monthlyInvestableIncome;

    @Column(name = "reaction_to_loss", nullable = false, length = 20)
    private String reactionToLoss;

    @Column(name = "financial_knowledge", nullable = false)
    private int financialKnowledge;

    @Column(name = "existing_investments", columnDefinition = "TEXT")
    private String existingInvestments;

    @Column(nullable = false, length = 10)
    private String dependents;

    @Column(name = "assessed_at", nullable = false)
    @Builder.Default
    private Instant assessedAt = Instant.now();
}
