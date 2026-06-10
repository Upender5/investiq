package com.investiq.user.dto.response;

import java.time.Instant;
import java.util.UUID;

public record AddressResponse(
    UUID id,
    String type,
    String line1,
    String line2,
    String city,
    String state,
    String pincode,
    String country,
    boolean primary,
    Instant createdAt
) {}
