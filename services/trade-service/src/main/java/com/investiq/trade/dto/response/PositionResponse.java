package com.investiq.trade.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record PositionResponse(
    String symbol,
    String exchange,
    String productType,            // INTRADAY | DELIVERY | MTF
    BigDecimal quantity,
    BigDecimal averagePrice,
    BigDecimal currentPrice,
    BigDecimal pnl,
    BigDecimal pnlPercent,
    BigDecimal dayPnl,
    BigDecimal dayPnlPercent,
    BigDecimal currentValue,
    BigDecimal investedValue,
    LocalDate firstBuyDate
) {}
