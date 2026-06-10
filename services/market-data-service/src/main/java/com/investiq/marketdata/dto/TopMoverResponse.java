package com.investiq.marketdata.dto;

import java.math.BigDecimal;

public record TopMoverResponse(
    String symbol,
    String name,
    BigDecimal lastPrice,
    BigDecimal change,
    BigDecimal changePercent,
    long volume,
    long marketCap,
    String sector
) {}
