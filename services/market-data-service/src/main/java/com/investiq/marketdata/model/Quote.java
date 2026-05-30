package com.investiq.marketdata.model;

import java.math.BigDecimal;
import java.time.Instant;

public record Quote(
    String symbol,
    String exchange,
    BigDecimal ltp,
    BigDecimal open,
    BigDecimal high,
    BigDecimal low,
    BigDecimal close,
    BigDecimal change,
    BigDecimal changePercent,
    long volume,
    Instant timestamp
) {}
