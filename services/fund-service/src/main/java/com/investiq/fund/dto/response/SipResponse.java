package com.investiq.fund.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record SipResponse(
    UUID id,
    String schemeCode,
    String schemeName,
    BigDecimal monthlyAmount,
    int sipDate,
    String status,              // ACTIVE | PAUSED | CANCELLED
    LocalDate startDate,
    LocalDate endDate,
    LocalDate nextInstalment,
    int completedInstalments,
    BigDecimal totalInvested,
    BigDecimal currentValue,
    BigDecimal xirr,
    String folioNumber,
    Instant createdAt
) {}
