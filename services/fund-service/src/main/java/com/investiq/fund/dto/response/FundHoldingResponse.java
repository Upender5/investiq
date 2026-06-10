package com.investiq.fund.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FundHoldingResponse(
    String schemeCode,
    String schemeName,
    String amc,
    String folioNumber,
    BigDecimal units,
    BigDecimal avgNav,
    BigDecimal currentNav,
    BigDecimal investedAmount,
    BigDecimal currentValue,
    BigDecimal absoluteReturn,
    BigDecimal absoluteReturnPercent,
    BigDecimal xirr,
    LocalDate firstInvestmentDate
) {}
