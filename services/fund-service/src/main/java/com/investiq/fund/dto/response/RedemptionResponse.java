package com.investiq.fund.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RedemptionResponse(
    UUID transactionId,
    String schemeCode,
    BigDecimal units,
    BigDecimal amount,
    BigDecimal applicableNav,
    String status,
    Instant estimatedCreditDate,
    Instant createdAt
) {}
