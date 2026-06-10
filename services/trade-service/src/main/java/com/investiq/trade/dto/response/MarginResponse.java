package com.investiq.trade.dto.response;

import java.math.BigDecimal;

public record MarginResponse(
    BigDecimal availableCash,
    BigDecimal usedMargin,
    BigDecimal totalCollateral,
    BigDecimal openingBalance,
    BigDecimal payin,
    BigDecimal payout,
    BigDecimal m2mUnrealisedPnl,
    BigDecimal m2mRealisedPnl,
    BigDecimal span,                  // SPAN margin (futures/options)
    BigDecimal exposure,
    BigDecimal optionPremium
) {}
