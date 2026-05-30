package com.investiq.notification.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.investiq.notification.domain.entity.Notification;
import com.investiq.notification.domain.repository.NotificationRepository;
import com.investiq.notification.kafka.event.TradeExecutedEvent;
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
public class TradeEventConsumer {

    private final NotificationRepository notificationRepository;
    private final NotificationSender notificationSender;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    @KafkaListener(topics = "trade.executed", groupId = "notification-service")
    public void onTradeExecuted(ConsumerRecord<String, String> record, Acknowledgment ack) {
        try {
            String dedupeKey = "notif:trade:" + record.key();
            if (Boolean.TRUE.equals(redisTemplate.opsForValue().setIfAbsent(dedupeKey, "1", Duration.ofSeconds(10)))) {
                TradeExecutedEvent event = objectMapper.readValue(record.value(), TradeExecutedEvent.class);
                String title = "Trade executed: %s %s".formatted(event.side(), event.symbol());
                String body  = "Qty: %s @ ₹%s".formatted(event.quantity(), event.averagePrice());

                notificationRepository.save(Notification.builder()
                    .userId(event.userId()).type(Notification.NotificationType.TRADE_EXECUTED)
                    .title(title).body(body).build());

                notificationSender.send(event.userId(), title, body);
            }
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to process TradeExecutedEvent", e);
        }
    }
}
