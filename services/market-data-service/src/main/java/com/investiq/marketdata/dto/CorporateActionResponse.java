package com.investiq.marketdata.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CorporateActionResponse(
    String symbol,
    String actionType,        // DIVIDEND | BONUS | SPLIT | RIGHTS | BUYBACK | AGM
    String purpose,
    BigDecimal amount,        // dividend amount / bonus ratio / split ratio
    LocalDate exDate,
    LocalDate recordDate,
    LocalDate paymentDate,
    String remarks
) {}
