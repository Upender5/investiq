package com.investiq.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.jwt")
public record JwtConfig(
    String secret,
    long accessTokenExpiryMs,
    long refreshTokenExpiryMs
) {}
