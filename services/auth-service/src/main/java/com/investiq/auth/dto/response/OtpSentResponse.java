package com.investiq.auth.dto.response;

public record OtpSentResponse(
    String message,
    int expirySeconds
) {}
