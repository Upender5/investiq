package com.investiq.auth.domain.repository;

import com.investiq.auth.domain.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    Optional<PasswordResetToken> findByTokenHashAndUsedFalse(String tokenHash);

    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.userId = :userId")
    void deleteAllByUserId(UUID userId);
}
