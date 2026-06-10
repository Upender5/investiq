package com.investiq.fund.kafka.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record SipCreatedEvent(
    UUID sipId,
    UUID userId,
    String schemeCode,
    BigDecimal monthlyAmount,
    int sipDate,
    LocalDate startDate,
    LocalDate endDate,
    UUID bankAccountId,
    String folioNumber,
    Instant occurredAt
) {}
