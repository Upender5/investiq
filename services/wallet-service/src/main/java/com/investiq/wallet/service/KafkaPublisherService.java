package com.investiq.wallet.service;

import com.investiq.wallet.config.KafkaTopicConfig;
import com.investiq.wallet.event.TradeFundedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaPublisherService {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final KafkaTopicConfig topics;

    public void publishTradeFunded(TradeFundedEvent event) {
        String key = event.userId().toString();
        CompletableFuture<SendResult<String, Object>> future =
            kafkaTemplate.send(topics.tradeFunded(), key, event);

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish trade.funded for journal={} user={}: {}",
                    event.journalId(), event.userId(), ex.getMessage());
            } else {
                log.info("Published trade.funded journal={} user={} offset={}",
                    event.journalId(), event.userId(),
                    result.getRecordMetadata().offset());
            }
        });
    }
}
