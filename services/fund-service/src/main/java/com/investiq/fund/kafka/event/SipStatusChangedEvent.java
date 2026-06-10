package com.investiq.fund.kafka.event;

import java.time.Instant;
import java.util.UUID;

public record SipStatusChangedEvent(
    UUID sipId,
    UUID userId,
    String schemeCode,
    String oldStatus,
    String newStatus,
    Instant occurredAt
) {}
