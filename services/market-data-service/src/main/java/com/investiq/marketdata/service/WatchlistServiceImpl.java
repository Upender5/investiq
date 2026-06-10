package com.investiq.marketdata.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.investiq.marketdata.dto.WatchlistResponse;
import com.investiq.marketdata.model.Quote;
import com.investiq.marketdata.provider.MarketDataProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class WatchlistServiceImpl implements WatchlistService {

    private static final String WL_KEY = "wl:%s:%s";       // wl:{userId}:{watchlistId}
    private static final String WL_LIST_KEY = "wl:list:%s"; // wl:list:{userId}
    private static final long   WL_TTL_DAYS = 90;

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final MarketDataProvider provider;
    private final QuoteCacheService quoteCache;

    @Override
    public List<WatchlistResponse> listWatchlists(UUID userId) {
        Set<String> ids = redisTemplate.opsForSet().members(listKey(userId));
        if (ids == null || ids.isEmpty()) return List.of();
        return ids.stream()
                .map(id -> loadWatchlist(userId, UUID.fromString(id)))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(WatchlistResponse::createdAt))
                .toList();
    }

    @Override
    public WatchlistResponse createWatchlist(UUID userId, String name) {
        UUID id = UUID.randomUUID();
        WatchlistData data = new WatchlistData(id, name, new ArrayList<>(), Instant.now(), Instant.now());
        saveWatchlist(userId, data);
        redisTemplate.opsForSet().add(listKey(userId), id.toString());
        redisTemplate.expire(listKey(userId), WL_TTL_DAYS, TimeUnit.DAYS);
        return toResponse(data, List.of());
    }

    @Override
    public WatchlistResponse getWatchlist(UUID userId, UUID watchlistId) {
        WatchlistData data = loadData(userId, watchlistId);
        List<WatchlistResponse.WatchlistItem> items = enrichItems(data.items());
        return toResponse(data, items);
    }

    @Override
    public WatchlistResponse renameWatchlist(UUID userId, UUID watchlistId, String newName) {
        WatchlistData data = loadData(userId, watchlistId);
        WatchlistData updated = new WatchlistData(data.id(), newName, data.items(), data.createdAt(), Instant.now());
        saveWatchlist(userId, updated);
        return toResponse(updated, enrichItems(updated.items()));
    }

    @Override
    public void deleteWatchlist(UUID userId, UUID watchlistId) {
        redisTemplate.delete(wlKey(userId, watchlistId));
        redisTemplate.opsForSet().remove(listKey(userId), watchlistId.toString());
    }

    @Override
    public WatchlistResponse addItem(UUID userId, UUID watchlistId, String symbol, String exchange) {
        WatchlistData data = loadData(userId, watchlistId);
        boolean exists = data.items().stream()
                .anyMatch(i -> i.symbol().equalsIgnoreCase(symbol));
        if (!exists) {
            data.items().add(new WatchlistItemData(symbol.toUpperCase(),
                    exchange != null ? exchange : "NSE", Instant.now()));
        }
        WatchlistData updated = new WatchlistData(data.id(), data.name(), data.items(), data.createdAt(), Instant.now());
        saveWatchlist(userId, updated);
        return toResponse(updated, enrichItems(updated.items()));
    }

    @Override
    public void removeItem(UUID userId, UUID watchlistId, String symbol) {
        WatchlistData data = loadData(userId, watchlistId);
        data.items().removeIf(i -> i.symbol().equalsIgnoreCase(symbol));
        WatchlistData updated = new WatchlistData(data.id(), data.name(), data.items(), data.createdAt(), Instant.now());
        saveWatchlist(userId, updated);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private WatchlistData loadData(UUID userId, UUID watchlistId) {
        WatchlistData data = loadWatchlistData(userId, watchlistId);
        if (data == null) throw new NoSuchElementException("Watchlist not found");
        return data;
    }

    private WatchlistResponse loadWatchlist(UUID userId, UUID watchlistId) {
        WatchlistData data = loadWatchlistData(userId, watchlistId);
        if (data == null) return null;
        return toResponse(data, List.of()); // items omitted in list view for performance
    }

    private WatchlistData loadWatchlistData(UUID userId, UUID watchlistId) {
        String json = redisTemplate.opsForValue().get(wlKey(userId, watchlistId));
        if (json == null) return null;
        try {
            return objectMapper.readValue(json, WatchlistData.class);
        } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize watchlist {}", watchlistId);
            return null;
        }
    }

    private void saveWatchlist(UUID userId, WatchlistData data) {
        try {
            String json = objectMapper.writeValueAsString(data);
            redisTemplate.opsForValue().set(wlKey(userId, data.id()), json, WL_TTL_DAYS, TimeUnit.DAYS);
        } catch (JsonProcessingException e) {
            log.error("Failed to save watchlist {}", data.id());
        }
    }

    private List<WatchlistResponse.WatchlistItem> enrichItems(List<WatchlistItemData> items) {
        return items.stream().map(item -> {
            Quote q = quoteCache.getCachedQuote(item.symbol()).orElseGet(() -> {
                Quote live = provider.getQuote(item.symbol());
                quoteCache.cacheQuote(live);
                return live;
            });
            return new WatchlistResponse.WatchlistItem(item.symbol(), item.exchange(), q, item.addedAt());
        }).toList();
    }

    private WatchlistResponse toResponse(WatchlistData data, List<WatchlistResponse.WatchlistItem> items) {
        return new WatchlistResponse(data.id(), data.name(), data.items().size(),
                items, data.createdAt(), data.updatedAt());
    }

    private String wlKey(UUID userId, UUID watchlistId) {
        return String.format(WL_KEY, userId, watchlistId);
    }

    private String listKey(UUID userId) {
        return String.format(WL_LIST_KEY, userId);
    }

    // ── Internal data models stored in Redis ──────────────────────────────────

    record WatchlistData(UUID id, String name, List<WatchlistItemData> items,
                         Instant createdAt, Instant updatedAt) {}

    record WatchlistItemData(String symbol, String exchange, Instant addedAt) {}
}
