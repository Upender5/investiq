package com.investiq.marketdata.dto;

import com.investiq.marketdata.model.Quote;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WatchlistResponse(
    UUID id,
    String name,
    int itemCount,
    List<WatchlistItem> items,
    Instant createdAt,
    Instant updatedAt
) {
    public record WatchlistItem(
        String symbol,
        String exchange,
        Quote quote,
        Instant addedAt
    ) {}
}
