package com.investiq.notification.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.fcm.enabled", havingValue = "false", matchIfMissing = true)
public class LoggingNotificationSender implements NotificationSender {
    @Override
    public void send(UUID userId, String title, String body) {
        log.info("[NOTIFY] user={} title={} body={}", userId, title, body);
    }
}
