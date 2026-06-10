package com.investiq.fund.kafka.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record FundRedeemedEvent(
    UUID transactionId,
    UUID userId,
    String schemeCode,
    BigDecimal units,
    BigDecimal amount,
    BigDecimal applicableNav,
    UUID bankAccountId,
    Instant estimatedCreditDate,
    Instant occurredAt
) {}
