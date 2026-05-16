package com.investiq.wallet.dto.response;

import com.investiq.wallet.domain.entity.Transaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TransactionResponse(
    UUID transactionId,
    UUID journalId,
    Transaction.Direction direction,
    BigDecimal amount,
    BigDecimal runningBalance,
    Transaction.TransactionType transactionType,
    Transaction.TransactionStatus status,
    String description,
    UUID referenceId,
    Instant createdAt
) {
    public static TransactionResponse from(Transaction t) {
        return new TransactionResponse(
            t.getId(), t.getJournalId(), t.getDirection(),
            t.getAmount(), t.getRunningBalance(), t.getTransactionType(),
            t.getStatus(), t.getDescription(), t.getReferenceId(), t.getCreatedAt());
    }
}
