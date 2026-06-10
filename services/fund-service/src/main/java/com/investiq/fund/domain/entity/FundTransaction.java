package com.investiq.fund.domain.entity;

import com.investiq.fund.domain.enums.TransactionStatus;
import com.investiq.fund.domain.enums.TransactionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "fund_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FundTransaction {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "scheme_code", nullable = false, length = 20)
    private String schemeCode;

    @Column(name = "folio_number", length = 50)
    private String folioNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionType type;

    @Column(nullable = false, precision = 20, scale = 2)
    private BigDecimal amount;

    @Column(precision = 20, scale = 4)
    private BigDecimal units;

    @Column(precision = 12, scale = 4)
    private BigDecimal nav;

    @Column(name = "bank_account_id", nullable = false)
    private UUID bankAccountId;

    @Column(name = "sip_mandate_id")
    private UUID sipMandateId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.status == null) this.status = TransactionStatus.SUBMITTED;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
