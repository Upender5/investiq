package com.investiq.marketdata.dto;

import java.math.BigDecimal;

public record StockDetail(
    String symbol,
    String name,
    String exchange,
    String sector,
    String industry,
    String isin,
    String series,
    BigDecimal faceValue,
    long marketCap,
    long shareOutstanding,
    boolean isFnOEnabled,
    boolean isInNifty50,
    boolean isInNifty500
) {}
