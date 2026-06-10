package com.investiq.fund.kafka;

import com.investiq.fund.config.KafkaTopicConfig;
import com.investiq.fund.kafka.event.FundInvestedEvent;
import com.investiq.fund.kafka.event.FundRedeemedEvent;
import com.investiq.fund.kafka.event.SipCreatedEvent;
import com.investiq.fund.kafka.event.SipStatusChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class FundEventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final KafkaTopicConfig topics;

    public void publishFundInvested(FundInvestedEvent event) {
        kafkaTemplate.send(topics.fundInvested(), event.transactionId().toString(), event)
            .whenComplete((r, ex) -> {
                if (ex != null) log.error("Failed to publish FundInvestedEvent txn={}", event.transactionId(), ex);
                else log.info("Published FundInvestedEvent txn={}", event.transactionId());
            });
    }

    public void publishFundRedeemed(FundRedeemedEvent event) {
        kafkaTemplate.send(topics.fundRedeemed(), event.transactionId().toString(), event)
            .whenComplete((r, ex) -> {
                if (ex != null) log.error("Failed to publish FundRedeemedEvent txn={}", event.transactionId(), ex);
                else log.info("Published FundRedeemedEvent txn={}", event.transactionId());
            });
    }

    public void publishSipCreated(SipCreatedEvent event) {
        kafkaTemplate.send(topics.sipCreated(), event.sipId().toString(), event)
            .whenComplete((r, ex) -> {
                if (ex != null) log.error("Failed to publish SipCreatedEvent sip={}", event.sipId(), ex);
                else log.info("Published SipCreatedEvent sip={}", event.sipId());
            });
    }

    public void publishSipStatusChanged(SipStatusChangedEvent event) {
        kafkaTemplate.send(topics.sipStatusChanged(), event.sipId().toString(), event)
            .whenComplete((r, ex) -> {
                if (ex != null) log.error("Failed to publish SipStatusChangedEvent sip={}", event.sipId(), ex);
                else log.info("Published SipStatusChangedEvent sip={} -> {}", event.sipId(), event.newStatus());
            });
    }
}
