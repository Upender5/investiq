package com.investiq.trade.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

public record ModifyOrderRequest(
    @DecimalMin("0.01") BigDecimal quantity,
    @DecimalMin("0.01") BigDecimal price,        // only for LIMIT orders
    @Min(0) Integer disclosedQuantity,            // for BSE disclosed-qty orders
    String validity                               // DAY | IOC | GTT
) {}
