package com.investiq.wallet.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "wallets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", unique = true)
    private UUID userId;  // null for system wallets

    @Enumerated(EnumType.STRING)
    @Column(name = "wallet_type", nullable = false)
    @Builder.Default
    private WalletType walletType = WalletType.USER;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "INR";

    @Column(nullable = false, precision = 20, scale = 2)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "locked_balance", nullable = false, precision = 20, scale = 2)
    @Builder.Default
    private BigDecimal lockedBalance = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private WalletStatus status = WalletStatus.ACTIVE;

    @Version
    private Long version;  // JPA optimistic lock — extra safety on top of pessimistic SELECT FOR UPDATE

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public BigDecimal getAvailableBalance() {
        return balance.subtract(lockedBalance);
    }

    // Direction-aware balance delta: USER wallets are credit-normal, SYSTEM wallets are debit-normal.
    public BigDecimal applyEntry(Transaction.Direction direction, BigDecimal amount) {
        boolean increases = walletType == WalletType.USER
            ? direction == Transaction.Direction.CREDIT
            : direction == Transaction.Direction.DEBIT;
        return increases ? balance.add(amount) : balance.subtract(amount);
    }

    public enum WalletType  { USER, SYSTEM_FLOAT, TRADE_ESCROW, FEE_REVENUE }
    public enum WalletStatus { ACTIVE, FROZEN, CLOSED }
}
