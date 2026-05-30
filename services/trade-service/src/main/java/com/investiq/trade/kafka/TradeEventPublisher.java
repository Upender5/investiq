package com.investiq.trade.kafka;

import com.investiq.trade.config.KafkaTopicConfig;
import com.investiq.trade.kafka.event.TradeExecutedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class TradeEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final KafkaTopicConfig topicConfig;

    public void publishTradeExecuted(TradeExecutedEvent event) {
        kafkaTemplate.send(topicConfig.tradeExecuted(), event.orderId().toString(), event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Failed to publish TradeExecutedEvent for order {}", event.orderId(), ex);
                } else {
                    log.info("Published TradeExecutedEvent for order {}", event.orderId());
                }
            });
    }
}
