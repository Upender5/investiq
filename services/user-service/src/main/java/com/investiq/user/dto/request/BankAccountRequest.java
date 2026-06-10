package com.investiq.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record BankAccountRequest(
    @NotBlank String accountHolderName,
    @NotBlank @Pattern(regexp = "^[0-9]{9,18}$") String accountNumber,
    @NotBlank @Pattern(regexp = "^[A-Z]{4}0[A-Z0-9]{6}$") String ifscCode,
    @NotBlank String bankName,
    String branchName,
    @NotBlank String accountType,   // SAVINGS | CURRENT
    boolean isPrimary
) {}
