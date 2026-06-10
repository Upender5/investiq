package com.investiq.auth.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_devices",
       uniqueConstraints = @UniqueConstraint(name = "idx_devices_token", columnNames = {"user_id", "device_token"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDevice {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "device_token", nullable = false, length = 512)
    private String deviceToken;

    @Column(name = "device_name", length = 100)
    private String deviceName;

    @Column(length = 20)
    private String platform;

    @Column(name = "app_version", length = 20)
    private String appVersion;

    @Column(length = 100)
    private String model;

    @Column(nullable = false)
    @Builder.Default
    private boolean trusted = true;

    @Column(name = "last_seen_at", nullable = false)
    @Builder.Default
    private Instant lastSeenAt = Instant.now();

    @Column(name = "registered_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant registeredAt = Instant.now();
}
