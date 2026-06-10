package com.investiq.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
    @NotBlank String identifier  // email or phone
) {}
