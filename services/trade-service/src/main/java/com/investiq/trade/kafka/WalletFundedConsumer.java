package com.investiq.trade.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.investiq.trade.kafka.event.WalletFundedEvent;
import com.investiq.trade.service.TradeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WalletFundedConsumer {

    private final TradeService tradeService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "${app.kafka.topics.trade-funded}", groupId = "trade-service")
    public void onWalletFunded(ConsumerRecord<String, String> record, Acknowledgment ack) {
        try {
            WalletFundedEvent event = objectMapper.readValue(record.value(), WalletFundedEvent.class);
            log.info("Received WalletFundedEvent for order {}", event.orderId());
            tradeService.executeFundedOrder(event);
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to process WalletFundedEvent: {}", record.value(), e);
            // do not ack — will be retried
        }
    }
}
