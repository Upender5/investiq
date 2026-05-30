package com.investiq.marketdata.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.market")
public record MarketConfig(
    String provider,
    Kite kite,
    Cache cache
) {
    public record Kite(String apiKey, String accessToken, String baseUrl) {}
    public record Cache(long quoteTtlSeconds, long ohlcvTtlSeconds) {}
}
