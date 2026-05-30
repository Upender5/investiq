package com.investiq.notification.controller;

import com.investiq.notification.domain.entity.Notification;
import com.investiq.notification.security.AuthenticatedUser;
import com.investiq.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public List<Notification> list(@AuthenticationPrincipal AuthenticatedUser user) {
        return notificationService.getNotifications(user.userId());
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(@AuthenticationPrincipal AuthenticatedUser user) {
        return Map.of("count", notificationService.getUnreadCount(user.userId()));
    }

    @PutMapping("/read-all")
    public void markAllRead(@AuthenticationPrincipal AuthenticatedUser user) {
        notificationService.markAllRead(user.userId());
    }

    @PutMapping("/{id}/read")
    public void markRead(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID id) {
        notificationService.markRead(user.userId(), id);
    }
}
