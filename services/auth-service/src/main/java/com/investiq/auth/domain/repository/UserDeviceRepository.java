package com.investiq.auth.domain.repository;

import com.investiq.auth.domain.entity.UserDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserDeviceRepository extends JpaRepository<UserDevice, UUID> {
    List<UserDevice> findByUserIdOrderByLastSeenAtDesc(UUID userId);
    Optional<UserDevice> findByIdAndUserId(UUID id, UUID userId);
    Optional<UserDevice> findByUserIdAndDeviceToken(UUID userId, String deviceToken);

    @Modifying
    @Query("UPDATE UserDevice d SET d.lastSeenAt = CURRENT_TIMESTAMP WHERE d.userId = :userId AND d.deviceToken = :token")
    void updateLastSeen(UUID userId, String token);
}
