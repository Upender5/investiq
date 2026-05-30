package com.investiq.trade.dto.response;

import com.investiq.trade.domain.entity.Order;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record OrderResponse(
    UUID id,
    UUID userId,
    String symbol,
    String exchange,
    Order.OrderType orderType,
    Order.TransactionSide side,
    BigDecimal quantity,
    BigDecimal price,
    Order.OrderStatus status,
    String brokerOrderId,
    BigDecimal averagePrice,
    BigDecimal filledQuantity,
    String failureReason,
    Instant createdAt,
    Instant updatedAt
) {
    public static OrderResponse from(Order o) {
        return new OrderResponse(
            o.getId(), o.getUserId(), o.getSymbol(), o.getExchange(),
            o.getOrderType(), o.getSide(), o.getQuantity(), o.getPrice(),
            o.getStatus(), o.getBrokerOrderId(), o.getAveragePrice(),
            o.getFilledQuantity(), o.getFailureReason(),
            o.getCreatedAt(), o.getUpdatedAt()
        );
    }
}
