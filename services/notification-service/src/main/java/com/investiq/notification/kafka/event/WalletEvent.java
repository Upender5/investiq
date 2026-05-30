package com.investiq.notification.kafka.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WalletEvent(UUID userId, String type, BigDecimal amount, Instant occurredAt) {}
