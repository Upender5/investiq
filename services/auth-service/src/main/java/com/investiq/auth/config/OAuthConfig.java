package com.investiq.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Server-side OAuth credentials for providers that use the Authorization Code flow
 * (GitHub, Facebook). The client secret never leaves the backend — the SPA only sends
 * the authorization code, which this service exchanges for an access token.
 */
@ConfigurationProperties(prefix = "app.oauth")
public record OAuthConfig(
    Provider github,
    Provider facebook
) {
    public record Provider(String clientId, String clientSecret) {}
}
