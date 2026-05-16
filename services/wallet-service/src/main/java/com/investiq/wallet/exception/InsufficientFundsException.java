package com.investiq.wallet.exception;

import java.math.BigDecimal;
import java.util.UUID;

public class InsufficientFundsException extends RuntimeException {
    public InsufficientFundsException(UUID walletId, BigDecimal available, BigDecimal requested) {
        super(String.format("Insufficient funds in wallet %s: available=%.2f requested=%.2f",
            walletId, available, requested));
    }
}
