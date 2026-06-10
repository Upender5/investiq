package com.investiq.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank String identifier,  // phone or email
    @NotBlank String password
) {}
