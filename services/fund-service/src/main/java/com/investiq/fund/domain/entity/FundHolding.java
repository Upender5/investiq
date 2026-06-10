package com.investiq.fund.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "fund_holdings",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_holding", columnNames = {"user_id", "scheme_code", "folio_number"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FundHolding {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "scheme_code", nullable = false, length = 20)
    private String schemeCode;

    @Column(name = "folio_number", length = 50)
    private String folioNumber;

    @Column(nullable = false, precision = 20, scale = 4)
    private BigDecimal units;

    @Column(name = "avg_nav", nullable = false, precision = 12, scale = 4)
    private BigDecimal avgNav;

    @Column(name = "invested_amount", nullable = false, precision = 20, scale = 2)
    private BigDecimal investedAmount;

    @Column(name = "first_investment_date", nullable = false)
    private LocalDate firstInvestmentDate;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
