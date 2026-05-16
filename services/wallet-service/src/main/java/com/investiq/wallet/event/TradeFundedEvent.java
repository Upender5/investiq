package com.investiq.wallet.event;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Published to the trade.funded topic when a deposit is confirmed (SETTLED).
 * Downstream consumers (trade-service) use this to release pending orders.
 */
public record TradeFundedEvent(
    UUID eventId,
    UUID userId,
    UUID walletId,
    UUID journalId,
    BigDecimal amount,
    String currency,
    Instant fundedAt
) {
    public static TradeFundedEvent of(UUID userId, UUID walletId, UUID journalId,
                                      BigDecimal amount, String currency) {
        return new TradeFundedEvent(UUID.randomUUID(), userId, walletId,
            journalId, amount, currency, Instant.now());
    }
}
