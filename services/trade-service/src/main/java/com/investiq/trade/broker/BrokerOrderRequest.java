package com.investiq.trade.broker;

import com.investiq.trade.domain.entity.Order;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record BrokerOrderRequest(
    String symbol,
    String exchange,
    Order.OrderType orderType,
    Order.TransactionSide side,
    BigDecimal quantity,
    BigDecimal price,      // null for MARKET orders
    String tag             // internal order UUID, for correlation in broker callbacks
) {}
