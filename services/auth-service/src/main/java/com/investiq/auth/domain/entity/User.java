package com.investiq.auth.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 15)
    private String phone;

    @Column(unique = true)
    private String email;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "mfa_enabled", nullable = false)
    @Builder.Default
    private boolean mfaEnabled = false;

    @Column(name = "mfa_secret", length = 64)
    private String mfaSecret;

    @Column(name = "oauth_provider", length = 20)
    private String oauthProvider;

    @Column(name = "oauth_subject", length = 255)
    private String oauthSubject;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.STUDENT;

    @Enumerated(EnumType.STRING)
    @Column(name = "kyc_status", nullable = false)
    @Builder.Default
    private KycStatus kycStatus = KycStatus.PENDING;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public enum Role { STUDENT, ADMIN }
    public enum KycStatus { PENDING, SUBMITTED, VERIFIED, REJECTED }
}
