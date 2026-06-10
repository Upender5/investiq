package com.investiq.auth.domain.repository;

import com.investiq.auth.domain.entity.MfaBackupCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface MfaBackupCodeRepository extends JpaRepository<MfaBackupCode, UUID> {
    List<MfaBackupCode> findByUserIdAndUsedFalse(UUID userId);

    @Modifying
    @Query("DELETE FROM MfaBackupCode c WHERE c.userId = :userId")
    void deleteAllByUserId(UUID userId);
}
