package com.investiq.auth.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
    boolean success,
    T data,
    String code,
    String message,
    Instant timestamp,
    String correlationId
) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null, null, Instant.now(), null);
    }

    public static <T> ApiResponse<T> ok(T data, String correlationId) {
        return new ApiResponse<>(true, data, null, null, Instant.now(), correlationId);
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(false, null, code, message, Instant.now(), null);
    }

    public static ApiResponse<Void> noContent() {
        return new ApiResponse<>(true, null, null, null, Instant.now(), null);
    }
}
