package com.investiq.notification.service;

import com.investiq.notification.domain.entity.Notification;
import com.investiq.notification.domain.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository repo;

    public List<Notification> getNotifications(UUID userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId);
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
}
