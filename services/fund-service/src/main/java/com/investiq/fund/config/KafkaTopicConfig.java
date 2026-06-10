package com.investiq.fund.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.kafka.config.TopicBuilder;

@ConfigurationProperties(prefix = "app.kafka.topics")
public record KafkaTopicConfig(
    String fundInvested,
    String fundRedeemed,
    String sipCreated,
    String sipStatusChanged
) {
    @Bean
    public NewTopic fundInvestedTopic() {
        return TopicBuilder.name(fundInvested).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic fundRedeemedTopic() {
        return TopicBuilder.name(fundRedeemed).partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic sipCreatedTopic() {
        return TopicBuilder.name(sipCreated).partitions(3).replicas(1).build();
    }
}
