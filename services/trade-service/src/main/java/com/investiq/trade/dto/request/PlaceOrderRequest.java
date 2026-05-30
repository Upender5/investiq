package com.investiq.trade.dto.request;

import com.investiq.trade.domain.entity.Order;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PlaceOrderRequest(
    @NotBlank String symbol,
    @NotBlank String exchange,
    @NotNull Order.OrderType orderType,
    @NotNull Order.TransactionSide side,
    @NotNull @DecimalMin("0.01") BigDecimal quantity,
    BigDecimal price  // required for LIMIT orders, validated in service
) {}
