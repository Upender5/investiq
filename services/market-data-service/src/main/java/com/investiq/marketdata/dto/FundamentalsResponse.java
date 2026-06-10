package com.investiq.marketdata.dto;

import java.math.BigDecimal;

public record FundamentalsResponse(
    String symbol,
    BigDecimal pe,
    BigDecimal pb,
    BigDecimal eps,
    BigDecimal bookValue,
    BigDecimal dividendYield,
    BigDecimal roe,
    BigDecimal roce,
    BigDecimal debtToEquity,
    BigDecimal currentRatio,
    BigDecimal revenueGrowthYoy,
    BigDecimal profitGrowthYoy,
    BigDecimal promoterHolding,
    BigDecimal fiiHolding,
    BigDecimal diiHolding,
    String valuationZone      // FAIR | OVERVALUED | UNDERVALUED
) {}
