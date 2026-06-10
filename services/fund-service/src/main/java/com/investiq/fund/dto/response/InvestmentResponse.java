package com.investiq.fund.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InvestmentResponse(
    UUID transactionId,
    String schemeCode,
    String schemeName,
    BigDecimal amount,
    BigDecimal estimatedUnits,
    String status,              // SUBMITTED | PROCESSING | ALLOTTED | FAILED
    String folioNumber,
    Instant createdAt
) {}
