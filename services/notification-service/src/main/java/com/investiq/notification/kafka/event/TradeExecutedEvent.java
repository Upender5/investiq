package com.investiq.notification.kafka.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TradeExecutedEvent(
    UUID orderId, UUID userId, String symbol, String side,
    BigDecimal quantity, BigDecimal averagePrice, Instant executedAt
) {}
