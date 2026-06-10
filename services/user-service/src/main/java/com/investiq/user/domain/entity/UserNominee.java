package com.investiq.user.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "user_nominees")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserNominee {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String relationship;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(length = 15)
    private String phone;

    @Column(name = "share_percentage", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal sharePercentage = BigDecimal.valueOf(100);

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
