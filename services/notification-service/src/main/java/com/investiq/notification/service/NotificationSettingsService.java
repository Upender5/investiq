package com.investiq.notification.service;

import com.investiq.notification.dto.NotificationSettingsResponse;
import com.investiq.notification.dto.UpdateNotificationSettingsRequest;

import java.util.UUID;

public interface NotificationSettingsService {
    NotificationSettingsResponse getSettings(UUID userId);
    NotificationSettingsResponse updateSettings(UUID userId, UpdateNotificationSettingsRequest request);
}
