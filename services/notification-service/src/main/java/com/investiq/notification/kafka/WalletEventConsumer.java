package com.investiq.notification.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.investiq.notification.domain.entity.Notification;
import com.investiq.notification.domain.repository.NotificationRepository;
import com.investiq.notification.kafka.event.WalletEvent;
import com.investiq.notification.notification.NotificationSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Slf4j
@Component
@RequiredArgsConstructor
public class WalletEventConsumer {

    private final NotificationRepository notificationRepository;
    private final NotificationSender notificationSender;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    @KafkaListener(topics = {"wallet.deposited", "wallet.withdrawn"}, groupId = "notification-service")
    public void onWalletEvent(ConsumerRecord<String, String> record, Acknowledgment ack) {
        try {
            String dedupeKey = "notif:wallet:" + record.topic() + ":" + record.key();
            if (Boolean.TRUE.equals(redisTemplate.opsForValue().setIfAbsent(dedupeKey, "1", Duration.ofSeconds(10)))) {
                WalletEvent event = objectMapper.readValue(record.value(), WalletEvent.class);
                boolean isDeposit = "wallet.deposited".equals(record.topic());
                String title = isDeposit ? "Deposit successful" : "Withdrawal processed";
                String body  = "₹%s has been %s your wallet".formatted(event.amount(),
                    isDeposit ? "added to" : "removed from");

                notificationRepository.save(Notification.builder()
                    .userId(event.userId())
                    .type(isDeposit ? Notification.NotificationType.DEPOSIT : Notification.NotificationType.WITHDRAWAL)
                    .title(title).body(body).build());

                notificationSender.send(event.userId(), title, body);
            }
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to process WalletEvent from {}", record.topic(), e);
        }
    }
}
