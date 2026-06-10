package com.investiq.marketdata.dto;

import java.math.BigDecimal;
import java.util.List;

public record TechnicalsResponse(
    String symbol,
    String timeframe,
    String overallSignal,           // BUY | SELL | NEUTRAL
    BigDecimal rsi,
    BigDecimal macd,
    BigDecimal macdSignal,
    BigDecimal macdHistogram,
    BigDecimal sma20,
    BigDecimal sma50,
    BigDecimal sma200,
    BigDecimal ema20,
    BigDecimal bollingerUpper,
    BigDecimal bollingerLower,
    BigDecimal bollingerMiddle,
    BigDecimal atr,
    BigDecimal volume20DayAvg,
    List<SupportResistance> supportLevels,
    List<SupportResistance> resistanceLevels
) {
    public record SupportResistance(BigDecimal price, String strength) {}
}
