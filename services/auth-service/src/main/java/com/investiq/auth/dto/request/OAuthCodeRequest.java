package com.investiq.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

/**
 * Authorization-Code login for providers that issue opaque access tokens
 * (GitHub, Facebook). The SPA sends the {@code code} from the provider redirect plus
 * the exact {@code redirectUri} it used; the backend exchanges them for an access token.
 */
public record OAuthCodeRequest(
    @NotBlank String code,
    @NotBlank String redirectUri,
    String deviceToken
) {}
