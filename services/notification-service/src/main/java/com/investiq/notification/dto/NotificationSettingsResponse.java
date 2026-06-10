package com.investiq.notification.dto;

import java.util.Map;
import java.util.UUID;

public record NotificationSettingsResponse(
    UUID userId,
    boolean pushEnabled,
    boolean emailEnabled,
    boolean smsEnabled,
    boolean whatsappEnabled,
    Map<String, ChannelConfig> categories   // ORDER_UPDATE, PRICE_ALERT, PORTFOLIO_SUMMARY, MARKET_NEWS, OFFERS
) {
    public record ChannelConfig(
        boolean push,
        boolean email,
        boolean sms,
        boolean whatsapp
    ) {}
}
