package com.investiq.marketdata.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WatchlistRequest(
    @NotBlank @Size(min = 1, max = 50) String name
) {}
