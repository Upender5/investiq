package com.investiq.marketdata.controller;

import java.time.Instant;

public record MarketStatusResponse(
    boolean nseOpen,
    boolean bseOpen,
    String session,        // PRE_OPEN | NORMAL | POST_CLOSE | AFTER_HOURS
    Instant nextOpenAt,
    Instant closesAt
) {}
