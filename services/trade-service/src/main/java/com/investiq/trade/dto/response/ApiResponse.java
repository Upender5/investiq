package com.investiq.trade.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Canonical response envelope for every InvestIQ API: {@code { "message": ..., "data": ... }}.
 * Success carries a human-readable message and a payload; errors carry a message and {@code data: null}.
 * No other top-level fields are emitted — the frontend contract depends on this exact shape.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(String message, T data) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>("Success", data);
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(message, data);
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(message, null);
    }

    public static <T> ApiResponse<T> error(String message, T data) {
        return new ApiResponse<>(message, data);
    }

    public static ApiResponse<Void> noContent() {
        return new ApiResponse<>("Success", null);
    }
}
