package com.investiq.marketdata.scheduler;

import com.investiq.marketdata.kafka.MarketQuotePublisher;
import com.investiq.marketdata.service.MarketDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class MarketDataScheduler {

    private static final List<String> TOP_SYMBOLS = List.of(
        "RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN",
        "WIPRO", "ICICIBANK", "BAJFINANCE", "MARUTI", "ITC"
    );

    private final MarketDataService marketDataService;
    private final MarketQuotePublisher publisher;

    @Scheduled(fixedDelay = 5000)
    public void refreshTopSymbols() {
        TOP_SYMBOLS.forEach(symbol -> {
            try {
                publisher.publishQuote(marketDataService.getQuote(symbol));
            } catch (Exception e) {
                log.warn("Failed to refresh quote for {}", symbol, e);
            }
        });
    }
}
