package com.investiq.marketdata.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.investiq.marketdata.config.MarketConfig;
import com.investiq.marketdata.model.Quote;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuoteCacheService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final MarketConfig marketConfig;

    private static final String KEY_PREFIX = "quote:";

    public Optional<Quote> getCachedQuote(String symbol) {
        String json = redisTemplate.opsForValue().get(KEY_PREFIX + symbol.toUpperCase());
        if (json == null) return Optional.empty();
        try {
            return Optional.of(objectMapper.readValue(json, Quote.class));
        } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize cached quote for {}", symbol);
            return Optional.empty();
        }
    }

    public void cacheQuote(Quote quote) {
        try {
            String json = objectMapper.writeValueAsString(quote);
            redisTemplate.opsForValue().set(KEY_PREFIX + quote.symbol(),
                json, Duration.ofSeconds(marketConfig.cache().quoteTtlSeconds()));
        } catch (JsonProcessingException e) {
            log.warn("Failed to cache quote for {}", quote.symbol());
        }
    }

    public void invalidate(String symbol) {
        redisTemplate.delete(KEY_PREFIX + symbol.toUpperCase());
    }
}
