package com.investiq.auth.service;

import com.investiq.auth.dto.response.AuthResponse;

/**
 * Validates provider ID tokens, creates or links user accounts, and issues JWTs.
 */
public interface OAuthService {
    AuthResponse loginWithGoogle(String idToken, String deviceToken);
    AuthResponse loginWithApple(String idToken, String deviceToken);
}
