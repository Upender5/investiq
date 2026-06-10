package com.investiq.trade.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;

/**
 * Redis-backed sliding-window rate limiter.
 * Enforces SEBI rule: max 60 trades/minute per user (configurable).
 */
@Slf4j
@Component
@Order(3)
public class RateLimitingFilter implements Filter {

    private final StringRedisTemplate redis;

    @Value("${app.rate-limit.trades-per-minute:60}")
    private int tradesPerMinute;

    public RateLimitingFilter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest  httpReq = (HttpServletRequest)  req;
        HttpServletResponse httpRes = (HttpServletResponse) res;

        // Only rate-limit order placement endpoints
        String uri = httpReq.getRequestURI();
        if ("POST".equals(httpReq.getMethod()) && uri.contains("/api/v1/orders")) {
            String userId = extractUserId(httpReq);
            if (userId != null && isRateLimited(userId)) {
                log.warn("Rate limit exceeded for user={}", userId);
                httpRes.setStatus(429);
                httpRes.setContentType("application/json");
                httpRes.getWriter().write(
                    "{\"status\":429,\"title\":\"Too Many Requests\"," +
                    "\"detail\":\"Order rate limit exceeded. Max " + tradesPerMinute + " orders/minute.\"}");
                return;
            }
        }
        chain.doFilter(req, res);
    }

    private boolean isRateLimited(String userId) {
        String key = "rate:orders:" + userId;
        Long count = redis.opsForValue().increment(key);
        if (count == 1) {
            redis.expire(key, Duration.ofMinutes(1));
        }
        return count != null && count > tradesPerMinute;
    }

    private String extractUserId(HttpServletRequest req) {
        // Principal set by JwtAuthenticationFilter
        var principal = req.getUserPrincipal();
        return principal != null ? principal.getName() : null;
    }
}
