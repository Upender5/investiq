package com.investiq.marketdata.service;

import com.investiq.marketdata.dto.WatchlistResponse;

import java.util.List;
import java.util.UUID;

public interface WatchlistService {
    List<WatchlistResponse> listWatchlists(UUID userId);
    WatchlistResponse createWatchlist(UUID userId, String name);
    WatchlistResponse getWatchlist(UUID userId, UUID watchlistId);
    WatchlistResponse renameWatchlist(UUID userId, UUID watchlistId, String newName);
    void deleteWatchlist(UUID userId, UUID watchlistId);
    WatchlistResponse addItem(UUID userId, UUID watchlistId, String symbol, String exchange);
    void removeItem(UUID userId, UUID watchlistId, String symbol);
}
