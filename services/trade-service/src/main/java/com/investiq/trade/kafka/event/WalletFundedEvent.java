package com.investiq.trade.kafka.event;

import java.math.BigDecimal;
import java.util.UUID;

public record WalletFundedEvent(UUID orderId, UUID userId, BigDecimal amount) {}
