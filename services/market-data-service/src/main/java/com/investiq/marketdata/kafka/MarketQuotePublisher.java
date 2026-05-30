package com.investiq.marketdata.kafka;

import com.investiq.marketdata.model.Quote;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class MarketQuotePublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishQuote(Quote quote) {
        kafkaTemplate.send("market.quote", quote.symbol(), quote)
            .whenComplete((r, ex) -> {
                if (ex != null) log.error("Failed to publish quote for {}", quote.symbol(), ex);
            });
    }
}
