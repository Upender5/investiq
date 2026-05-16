package com.investiq.wallet.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.kafka.config.TopicBuilder;

@ConfigurationProperties(prefix = "app.kafka.topics")
public record KafkaTopicConfig(String tradeFunded) {

    @Bean
    public NewTopic tradeFundedTopic() {
        return TopicBuilder.name(tradeFunded)
            .partitions(3)
            .replicas(1)
            .build();
    }
}
