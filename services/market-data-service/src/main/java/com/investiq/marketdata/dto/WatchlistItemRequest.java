package com.investiq.marketdata.dto;

import jakarta.validation.constraints.NotBlank;

public record WatchlistItemRequest(
    @NotBlank String symbol,
    @NotBlank String exchange
) {}
