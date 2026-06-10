package com.investiq.fund.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record MutualFundDetail(
    MutualFundSummary summary,
    String fundObjective,
    String benchmarkIndex,
    String fundManager,
    LocalDate inceptionDate,
    BigDecimal returns10y,
    BigDecimal standardDeviation,
    BigDecimal sharpeRatio,
    BigDecimal beta,
    BigDecimal alpha,
    BigDecimal exitLoad,
    String exitLoadPeriod,
    List<HoldingSummary> topHoldings,
    List<SectorAllocation> sectorAllocation
) {
    public record HoldingSummary(String name, BigDecimal percentage, String sector) {}
    public record SectorAllocation(String sector, BigDecimal percentage) {}
}
