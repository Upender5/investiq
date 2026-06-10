package com.investiq.fund.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record InvestRequest(
    @NotBlank String schemeCode,
    @NotNull @DecimalMin("500.00") BigDecimal amount,
    @NotNull UUID bankAccountId,
    String folioNumber  // null = create new folio
) {}
