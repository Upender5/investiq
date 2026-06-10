package com.investiq.user.domain.repository;

import com.investiq.user.domain.entity.UserBankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserBankAccountRepository extends JpaRepository<UserBankAccount, UUID> {
    List<UserBankAccount> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<UserBankAccount> findByIdAndUserId(UUID id, UUID userId);

    @Modifying
    @Query("UPDATE UserBankAccount b SET b.primary = false WHERE b.userId = :userId")
    void clearPrimary(UUID userId);
}
