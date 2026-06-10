package com.investiq.trade.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TradeResponse(
    UUID tradeId,
    UUID orderId,
    String symbol,
    String exchange,
    String side,                  // BUY | SELL
    BigDecimal quantity,
    BigDecimal price,
    BigDecimal value,             // quantity * price
    BigDecimal brokerage,
    BigDecimal stt,               // Securities Transaction Tax
    BigDecimal gst,
    BigDecimal stampDuty,
    BigDecimal netAmount,         // value ± brokerage + taxes
    String brokerTradeId,
    Instant executedAt
) {}
