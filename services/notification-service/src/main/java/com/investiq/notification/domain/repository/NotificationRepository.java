package com.investiq.notification.domain.repository;

import com.investiq.notification.domain.entity.Notification;
import com.investiq.notification.domain.entity.Notification.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Page<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    Page<Notification> findByUserIdAndRead(UUID userId, Boolean read, Pageable pageable);
    Page<Notification> findByUserIdAndType(UUID userId, NotificationType type, Pageable pageable);
    Page<Notification> findByUserIdAndReadAndType(UUID userId, Boolean read, NotificationType type, Pageable pageable);
    long countByUserIdAndReadFalse(UUID userId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.userId = :userId AND n.read = false")
    int markAllReadForUser(UUID userId);
}
