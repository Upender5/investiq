package com.investiq.trade.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.kafka.config.TopicBuilder;

@ConfigurationProperties(prefix = "app.kafka.topics")
public record KafkaTopicConfig(String tradeFunded, String tradeExecuted) {

    @Bean
    public NewTopic tradeExecutedTopic() {
        return TopicBuilder.name(tradeExecuted)
            .partitions(3)
            .replicas(1)
            .build();
    }
}
