package com.investiq.marketdata.dto;

import java.time.Instant;
import java.util.List;

public record NewsItem(
    String id,
    String title,
    String summary,
    String url,
    String source,
    String sentiment,           // POSITIVE | NEGATIVE | NEUTRAL
    double sentimentScore,
    List<String> symbols,
    Instant publishedAt
) {}
