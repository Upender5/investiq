package com.investiq.notification.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.investiq.notification.dto.NotificationSettingsResponse;
import com.investiq.notification.dto.UpdateNotificationSettingsRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationSettingsServiceImpl implements NotificationSettingsService {

    private static final String KEY_PREFIX = "notif:settings:";
    private static final long   SETTINGS_TTL_DAYS = 365;

    private static final Map<String, NotificationSettingsResponse.ChannelConfig> DEFAULT_CATEGORIES =
            Map.of(
                "ORDER_UPDATE",       new NotificationSettingsResponse.ChannelConfig(true,  true,  true,  false),
                "PRICE_ALERT",        new NotificationSettingsResponse.ChannelConfig(true,  false, false, false),
                "PORTFOLIO_SUMMARY",  new NotificationSettingsResponse.ChannelConfig(true,  true,  false, false),
                "MARKET_NEWS",        new NotificationSettingsResponse.ChannelConfig(true,  false, false, false),
                "OFFERS",             new NotificationSettingsResponse.ChannelConfig(false, true,  false, false)
            );

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public NotificationSettingsResponse getSettings(UUID userId) {
        String json = redisTemplate.opsForValue().get(key(userId));
        if (json == null) return defaultSettings(userId);
        try {
            return objectMapper.readValue(json, NotificationSettingsResponse.class);
        } catch (JsonProcessingException e) {
            log.warn("Failed to deserialize notification settings for userId={}", userId);
            return defaultSettings(userId);
        }
    }

    @Override
    public NotificationSettingsResponse updateSettings(UUID userId, UpdateNotificationSettingsRequest request) {
        NotificationSettingsResponse current = getSettings(userId);

        boolean push     = request.pushEnabled()    != null ? request.pushEnabled()    : current.pushEnabled();
        boolean email    = request.emailEnabled()   != null ? request.emailEnabled()   : current.emailEnabled();
        boolean sms      = request.smsEnabled()     != null ? request.smsEnabled()     : current.smsEnabled();
        boolean whatsapp = request.whatsappEnabled() != null ? request.whatsappEnabled() : current.whatsappEnabled();

        Map<String, NotificationSettingsResponse.ChannelConfig> merged = new LinkedHashMap<>(current.categories());
        if (request.categories() != null) {
            merged.putAll(request.categories());
        }

        NotificationSettingsResponse updated = new NotificationSettingsResponse(
                userId, push, email, sms, whatsapp, merged);
        persist(userId, updated);
        return updated;
    }

    private NotificationSettingsResponse defaultSettings(UUID userId) {
        return new NotificationSettingsResponse(userId, true, true, true, false, DEFAULT_CATEGORIES);
    }

    private void persist(UUID userId, NotificationSettingsResponse settings) {
        try {
            String json = objectMapper.writeValueAsString(settings);
            redisTemplate.opsForValue().set(key(userId), json, SETTINGS_TTL_DAYS, TimeUnit.DAYS);
        } catch (JsonProcessingException e) {
            log.error("Failed to persist notification settings for userId={}", userId);
        }
    }

    private String key(UUID userId) {
        return KEY_PREFIX + userId;
    }
}
