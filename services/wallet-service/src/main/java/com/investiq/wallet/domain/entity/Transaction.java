package com.investiq.wallet.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * One row = one side of a double-entry journal.
 * Every financial event creates exactly two rows sharing the same journal_id:
 *   - one for the user wallet  (CREDIT on deposit, DEBIT on withdrawal)
 *   - one for a system account (DEBIT on deposit,  CREDIT on withdrawal)
 *
 * Invariant: for any journal_id, SUM of signed amounts = 0
 *   where sign = +1 for a credit-normal account receiving CREDIT (or debit-normal receiving DEBIT)
 *         sign = -1 otherwise
 */
@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "journal_id", nullable = false)
    private UUID journalId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id", nullable = false)
    private Wallet wallet;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Direction direction;

    @Column(nullable = false, precision = 20, scale = 2)
    private BigDecimal amount;

    @Column(name = "running_balance", nullable = false, precision = 20, scale = 2)
    private BigDecimal runningBalance;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    private TransactionType transactionType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TransactionStatus status = TransactionStatus.PENDING;

    @Column(name = "idempotency_key", unique = true, length = 128)
    private String idempotencyKey;  // set only on the user-wallet leg

    @Column(name = "reference_id")
    private UUID referenceId;  // payment_id, trade_id, etc.

    @Column(length = 500)
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum Direction         { CREDIT, DEBIT }
    public enum TransactionType   { DEPOSIT, WITHDRAWAL, TRADE_LOCK, TRADE_UNLOCK, TRADE_SETTLE, FEE, REFUND }
    public enum TransactionStatus { PENDING, SETTLED, FAILED, REVERSED }
}
