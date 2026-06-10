package com.investiq.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record OAuthLoginRequest(
    @NotNull OAuthProvider provider,
    @NotBlank String idToken,
    String deviceToken
) {
    public enum OAuthProvider { GOOGLE, APPLE }
}
