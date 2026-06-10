package com.investiq.fund.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "mutual_funds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MutualFund {

    @Id
    @Column(name = "scheme_code", length = 20)
    private String schemeCode;

    @Column(name = "scheme_name", nullable = false, length = 500)
    private String schemeName;

    @Column(nullable = false, length = 100)
    private String amc;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(name = "sub_category", length = 100)
    private String subCategory;

    @Column(name = "risk_level", nullable = false, length = 30)
    private String riskLevel;

    @Column(precision = 12, scale = 4)
    private BigDecimal nav;

    @Column(name = "nav_date")
    private LocalDate navDate;

    @Column(name = "returns_1y", precision = 8, scale = 4)
    private BigDecimal returns1y;

    @Column(name = "returns_3y", precision = 8, scale = 4)
    private BigDecimal returns3y;

    @Column(name = "returns_5y", precision = 8, scale = 4)
    private BigDecimal returns5y;

    @Column(name = "returns_10y", precision = 8, scale = 4)
    private BigDecimal returns10y;

    @Column(precision = 20, scale = 2)
    private BigDecimal aum;

    @Column(name = "crisil_rating", length = 10)
    private String crisilRating;

    @Column(name = "expense_ratio", precision = 6, scale = 4)
    private BigDecimal expenseRatio;

    @Column(name = "min_investment", precision = 12, scale = 2)
    private BigDecimal minInvestment;

    @Column(name = "min_sip", precision = 12, scale = 2)
    private BigDecimal minSip;

    @Column(name = "fund_objective", columnDefinition = "text")
    private String fundObjective;

    @Column(name = "benchmark_index", length = 100)
    private String benchmarkIndex;

    @Column(name = "fund_manager", length = 200)
    private String fundManager;

    @Column(name = "inception_date")
    private LocalDate inceptionDate;

    @Column(name = "std_deviation", precision = 8, scale = 4)
    private BigDecimal standardDeviation;

    @Column(name = "sharpe_ratio", precision = 8, scale = 4)
    private BigDecimal sharpeRatio;

    @Column(precision = 8, scale = 4)
    private BigDecimal beta;

    @Column(precision = 8, scale = 4)
    private BigDecimal alpha;

    @Column(name = "exit_load", precision = 6, scale = 4)
    private BigDecimal exitLoad;

    @Column(name = "exit_load_period", length = 100)
    private String exitLoadPeriod;

    @Column(name = "top_holdings", columnDefinition = "text")
    private String topHoldingsJson;

    @Column(name = "sector_allocation", columnDefinition = "text")
    private String sectorAllocationJson;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
