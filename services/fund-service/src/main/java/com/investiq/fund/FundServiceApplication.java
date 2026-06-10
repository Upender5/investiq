package com.investiq.fund;

import com.investiq.fund.config.JwtConfig;
import com.investiq.fund.config.KafkaTopicConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({JwtConfig.class, KafkaTopicConfig.class})
public class FundServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(FundServiceApplication.class, args);
    }
}
