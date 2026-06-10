package com.investiq.user.dto.request;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record NomineeRequest(
    @NotBlank @Size(min = 2, max = 100) String name,
    @NotBlank String relationship,
    @Past LocalDate dateOfBirth,
    @NotBlank @Pattern(regexp = "^[6-9]\\d{9}$") String phone,
    @DecimalMin("0.01") @DecimalMax("100.00") java.math.BigDecimal sharePercentage
) {}
