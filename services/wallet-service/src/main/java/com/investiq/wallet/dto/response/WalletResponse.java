package com.investiq.wallet.dto.response;

import com.investiq.wallet.domain.entity.Wallet;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WalletResponse(
    UUID walletId,
    UUID userId,
    String currency,
    BigDecimal balance,
    BigDecimal lockedBalance,
    BigDecimal availableBalance,
    Wallet.WalletStatus status,
    Instant createdAt
) {
    public static WalletResponse from(Wallet w) {
        return new WalletResponse(w.getId(), w.getUserId(), w.getCurrency(),
            w.getBalance(), w.getLockedBalance(), w.getAvailableBalance(),
            w.getStatus(), w.getCreatedAt());
    }
}
