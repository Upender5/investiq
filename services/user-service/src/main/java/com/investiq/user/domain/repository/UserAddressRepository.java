package com.investiq.user.domain.repository;

import com.investiq.user.domain.entity.UserAddress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserAddressRepository extends JpaRepository<UserAddress, UUID> {
    List<UserAddress> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Optional<UserAddress> findByIdAndUserId(UUID id, UUID userId);

    @Modifying
    @Query("UPDATE UserAddress a SET a.primary = false WHERE a.userId = :userId")
    void clearPrimary(UUID userId);
}
