package com.investiq.auth.dto.response;

import java.time.Instant;
import java.util.UUID;

public record DeviceResponse(
    UUID id,
    String deviceName,
    String deviceType,
    String platform,
    String appVersion,
    boolean trusted,
    boolean current,
    Instant lastSeenAt,
    Instant registeredAt
) {}
