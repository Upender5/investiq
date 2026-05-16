package com.investiq.trade.broker;

import java.math.BigDecimal;

public record BrokerOrderResult(
    String brokerOrderId,
    BrokerOrderStatus status,
    BigDecimal averagePrice,
    BigDecimal filledQuantity,
    String message
) {
    public enum BrokerOrderStatus { COMPLETE, OPEN, CANCELLED, REJECTED }
}
