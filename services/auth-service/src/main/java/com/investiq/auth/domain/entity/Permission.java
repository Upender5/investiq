package com.investiq.auth.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "permissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permission {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(unique = true, nullable = false, length = 100)
    private String name;   // e.g. PLACE_ORDER, VIEW_PORTFOLIO

    @Column(length = 250)
    private String description;

    @Column(length = 50)
    private String category;  // TRADING | PORTFOLIO | ADMIN | ANALYTICS | KYC
}
