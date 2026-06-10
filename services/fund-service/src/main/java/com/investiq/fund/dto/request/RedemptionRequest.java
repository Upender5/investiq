package com.investiq.fund.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record RedemptionRequest(
    BigDecimal units,           // either units or amount must be set (validated in service)
    BigDecimal amount,
    boolean redeemAll,
    @NotNull UUID bankAccountId
) {}
