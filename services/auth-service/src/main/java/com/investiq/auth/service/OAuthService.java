package com.investiq.auth.service;

import com.investiq.auth.dto.response.AuthResponse;

/**
 * Validates provider ID tokens, creates or links user accounts, and issues JWTs.
 */
public interface OAuthService {
    AuthResponse loginWithGoogle(String idToken, String deviceToken);
    AuthResponse loginWithApple(String idToken, String deviceToken);

    /** Authorization-Code providers — exchange {@code code} for an access token, then fetch the profile. */
    AuthResponse loginWithGithub(String code, String redirectUri, String deviceToken);
    AuthResponse loginWithFacebook(String code, String redirectUri, String deviceToken);
}
