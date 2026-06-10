package com.investiq.fund.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record MutualFundSummary(
    String schemeCode,
    String schemeName,
    String amc,
    String category,
    String subCategory,
    String riskLevel,           // LOW | MODERATE | MODERATELY_HIGH | HIGH | VERY_HIGH
    BigDecimal nav,
    LocalDate navDate,
    BigDecimal returns1y,
    BigDecimal returns3y,
    BigDecimal returns5y,
    BigDecimal aum,             // in crores
    String crisilRating,        // 1–5 stars
    BigDecimal expenseRatio,
    BigDecimal minInvestment
) {}
