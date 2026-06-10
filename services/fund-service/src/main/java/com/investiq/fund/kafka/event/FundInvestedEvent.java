package com.investiq.fund.kafka.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record FundInvestedEvent(
    UUID transactionId,
    UUID userId,
    String schemeCode,
    String schemeName,
    BigDecimal amount,
    BigDecimal estimatedUnits,
    String folioNumber,
    UUID bankAccountId,
    Instant occurredAt
) {}
