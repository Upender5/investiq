package com.investiq.wallet.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record DepositRequest(

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "10.00", message = "Minimum deposit is ₹10")
    @Digits(integer = 18, fraction = 2, message = "Amount must have at most 2 decimal places")
    BigDecimal amount,

    @Size(max = 500)
    String description,

    UUID referenceId  // payment-gateway transaction ID (optional)
) {}
