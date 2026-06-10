package com.investiq.marketdata.controller;

import com.investiq.marketdata.dto.WatchlistItemRequest;
import com.investiq.marketdata.dto.WatchlistRequest;
import com.investiq.marketdata.dto.WatchlistResponse;
import com.investiq.marketdata.security.AuthenticatedUser;
import com.investiq.marketdata.service.WatchlistService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/watchlists")
@RequiredArgsConstructor
@Tag(name = "Watchlists", description = "Create and manage personalised stock watchlists")
@SecurityRequirement(name = "bearerAuth")
public class WatchlistController {

    private final WatchlistService watchlistService;

    @GetMapping
    @Operation(summary = "List all watchlists with live quotes for each item")
    public List<WatchlistResponse> list(@AuthenticationPrincipal AuthenticatedUser user) {
        return watchlistService.listWatchlists(user.userId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new named watchlist (max 5 per user)")
    public WatchlistResponse create(
            @Valid @RequestBody WatchlistRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return watchlistService.createWatchlist(user.userId(), request.name());
    }

    @GetMapping("/{watchlistId}")
    @Operation(summary = "Get a single watchlist with live quote data")
    public WatchlistResponse get(
            @PathVariable UUID watchlistId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return watchlistService.getWatchlist(user.userId(), watchlistId);
    }

    @PatchMapping("/{watchlistId}")
    @Operation(summary = "Rename a watchlist")
    public WatchlistResponse rename(
            @PathVariable UUID watchlistId,
            @Valid @RequestBody WatchlistRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return watchlistService.renameWatchlist(user.userId(), watchlistId, request.name());
    }

    @DeleteMapping("/{watchlistId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a watchlist and all its items")
    public void delete(
            @PathVariable UUID watchlistId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        watchlistService.deleteWatchlist(user.userId(), watchlistId);
    }

    @PostMapping("/{watchlistId}/items")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a symbol to a watchlist (max 50 items per list)")
    public WatchlistResponse addItem(
            @PathVariable UUID watchlistId,
            @Valid @RequestBody WatchlistItemRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return watchlistService.addItem(user.userId(), watchlistId, request.symbol(), request.exchange());
    }

    @DeleteMapping("/{watchlistId}/items/{symbol}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove a symbol from a watchlist")
    public void removeItem(
            @PathVariable UUID watchlistId,
            @PathVariable String symbol,
            @AuthenticationPrincipal AuthenticatedUser user) {
        watchlistService.removeItem(user.userId(), watchlistId, symbol);
    }
}
