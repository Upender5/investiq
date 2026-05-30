package com.investiq.marketdata.model;

import java.math.BigDecimal;
import java.time.Instant;

public record OhlcvBar(
    String symbol,
    Instant timestamp,
    BigDecimal open,
    BigDecimal high,
    BigDecimal low,
    BigDecimal close,
    long volume
) {}
