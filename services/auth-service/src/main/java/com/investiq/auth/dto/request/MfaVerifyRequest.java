package com.investiq.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record MfaVerifyRequest(
    @NotBlank @Pattern(regexp = "^\\d{6}$|^[A-Z0-9]{8}$",
                       message = "Must be a 6-digit TOTP code or 8-char backup code")
    String code
) {}
