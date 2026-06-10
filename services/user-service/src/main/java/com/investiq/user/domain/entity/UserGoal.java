package com.investiq.user.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "user_goals")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserGoal {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "goal_type", nullable = false, length = 30)
    private String goalType;

    @Column(name = "target_amount", nullable = false, precision = 20, scale = 2)
    private BigDecimal targetAmount;

    @Column(name = "target_date", nullable = false)
    private LocalDate targetDate;

    @Column(name = "current_savings", nullable = false, precision = 20, scale = 2)
    @Builder.Default
    private BigDecimal currentSavings = BigDecimal.ZERO;

    @Column(name = "monthly_contribution", nullable = false, precision = 20, scale = 2)
    @Builder.Default
    private BigDecimal monthlyContribution = BigDecimal.ZERO;

    @Column(length = 50)
    private String icon;

    @Column(length = 20)
    private String color;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() { this.updatedAt = Instant.now(); }
}
