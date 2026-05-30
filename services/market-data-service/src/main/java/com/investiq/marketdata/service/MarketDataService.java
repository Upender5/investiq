package com.investiq.marketdata.service;

import com.investiq.marketdata.model.OhlcvBar;
import com.investiq.marketdata.model.Quote;
import com.investiq.marketdata.model.SearchResult;
import com.investiq.marketdata.provider.MarketDataProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MarketDataService {

    private final MarketDataProvider provider;
    private final QuoteCacheService cache;

    public Quote getQuote(String symbol) {
        Optional<Quote> cached = cache.getCachedQuote(symbol);
        if (cached.isPresent()) return cached.get();
        Quote quote = provider.getQuote(symbol);
        cache.cacheQuote(quote);
        return quote;
    }

    public List<Quote> getQuotes(List<String> symbols) {
        return symbols.stream().map(this::getQuote).toList();
    }

    public List<SearchResult> search(String query) {
        return provider.search(query);
    }

    public List<OhlcvBar> getOhlcv(String symbol, String interval, int bars) {
        return provider.getOhlcv(symbol, interval, bars);
    }
}
