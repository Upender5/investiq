package com.investiq.user.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.UUID;

public record NomineeResponse(
    UUID id,
    String name,
    String relationship,
    LocalDate dateOfBirth,
    String maskedPhone,
    BigDecimal sharePercentage,
    Instant createdAt
) {}
