package com.investiq.user.dto.response;

import java.time.Instant;
import java.util.UUID;

public record BankAccountResponse(
    UUID id,
    String accountHolderName,
    String maskedAccountNumber,   // e.g. XXXXXXXX1234
    String ifscCode,
    String bankName,
    String branchName,
    String accountType,
    boolean primary,
    boolean verified,
    Instant createdAt
) {}
