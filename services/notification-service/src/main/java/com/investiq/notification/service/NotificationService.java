package com.investiq.notification.service;

import com.investiq.notification.domain.entity.Notification;
import com.investiq.notification.domain.entity.Notification.NotificationType;
import com.investiq.notification.domain.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository repo;

    public Page<Notification> getNotifications(UUID userId, Boolean read, String type, Pageable pageable) {
        NotificationType nt = parseType(type);
        if (read != null && nt != null) return repo.findByUserIdAndReadAndType(userId, read, nt, pageable);
        if (read != null) return repo.findByUserIdAndRead(userId, read, pageable);
        if (nt != null) return repo.findByUserIdAndType(userId, nt, pageable);
        return repo.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    private NotificationType parseType(String type) {
        if (type == null || type.isBlank()) return null;
        try {
            return NotificationType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public Page<Notification> getNotifications(UUID userId, Pageable pageable) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public long getUnreadCount(UUID userId) {
        return repo.countByUserIdAndReadFalse(userId);
    }

    @Transactional
    public void markAllRead(UUID userId) {
        repo.markAllReadForUser(userId);
    }

    @Transactional
    public void markRead(UUID userId, UUID notifId) {
        Notification n = repo.findById(notifId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!n.getUserId().equals(userId)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        n.setRead(true);
        repo.save(n);
    }

    @Transactional
    public void delete(UUID userId, UUID notifId) {
        Notification n = repo.findById(notifId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!n.getUserId().equals(userId)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        repo.delete(n);
    }
}
