package com.investiq.notification.dto;

import java.util.Map;

public record UpdateNotificationSettingsRequest(
    Boolean pushEnabled,
    Boolean emailEnabled,
    Boolean smsEnabled,
    Boolean whatsappEnabled,
    Map<String, NotificationSettingsResponse.ChannelConfig> categories
) {}
