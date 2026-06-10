package com.investiq.fund.dto.request;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record SipRequest(
    @NotBlank String schemeCode,
    @NotNull @DecimalMin("100.00") BigDecimal monthlyAmount,
    @NotNull @Min(1) @Max(28) int sipDate,       // day of month (1–28)
    @NotNull UUID bankAccountId,
    @NotNull @Future LocalDate startDate,
    LocalDate endDate,                             // null = perpetual
    String folioNumber
) {}
