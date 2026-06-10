package com.investiq.notification.controller;

import com.investiq.notification.domain.entity.Notification;
import com.investiq.notification.dto.NotificationSettingsResponse;
import com.investiq.notification.dto.UpdateNotificationSettingsRequest;
import com.investiq.notification.security.AuthenticatedUser;
import com.investiq.notification.service.NotificationService;
import com.investiq.notification.service.NotificationSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationSettingsService settingsService;

    // ─── Notification Feed ───────────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "Paginated notification feed, newest first",
               description = "Supports ?read=false&type=ORDER_UPDATE&page=0&size=20")
    public Page<Notification> list(
            @AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(required = false) Boolean read,
            @RequestParam(required = false) String type,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return notificationService.getNotifications(user.userId(), read, type, pageable);
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Count of unread notifications — use for badge on app icon")
    public Map<String, Long> unreadCount(@AuthenticationPrincipal AuthenticatedUser user) {
        return Map.of("count", notificationService.getUnreadCount(user.userId()));
    }

    @PutMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Mark all notifications as read")
    public void markAllRead(@AuthenticationPrincipal AuthenticatedUser user) {
        notificationService.markAllRead(user.userId());
    }

    @PutMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Mark a single notification as read")
    public void markRead(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable UUID id) {
        notificationService.markRead(user.userId(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a notification")
    public void delete(
            @AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable UUID id) {
        notificationService.delete(user.userId(), id);
    }

    // ─── Settings ────────────────────────────────────────────────────────────

    @GetMapping("/settings")
    @Operation(summary = "Get notification channel and category preferences")
    public NotificationSettingsResponse getSettings(@AuthenticationPrincipal AuthenticatedUser user) {
        return settingsService.getSettings(user.userId());
    }

    @PutMapping("/settings")
    @Operation(summary = "Update notification preferences — granular per channel and category")
    public NotificationSettingsResponse updateSettings(
            @Valid @RequestBody UpdateNotificationSettingsRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return settingsService.updateSettings(user.userId(), request);
    }
}
