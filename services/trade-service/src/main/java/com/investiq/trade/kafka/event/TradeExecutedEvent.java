package com.investiq.trade.kafka.event;

import com.investiq.trade.domain.entity.Order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TradeExecutedEvent(
    UUID orderId,
    UUID userId,
    String symbol,
    Order.TransactionSide side,
    BigDecimal quantity,
    BigDecimal averagePrice,
    Instant executedAt
) {}
