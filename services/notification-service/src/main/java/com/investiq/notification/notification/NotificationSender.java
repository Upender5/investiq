package com.investiq.notification.notification;

import java.util.UUID;

public interface NotificationSender {
    void send(UUID userId, String title, String body);
}
