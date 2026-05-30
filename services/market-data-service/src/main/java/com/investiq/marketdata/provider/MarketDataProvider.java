package com.investiq.marketdata.provider;

import com.investiq.marketdata.model.OhlcvBar;
import com.investiq.marketdata.model.Quote;
import com.investiq.marketdata.model.SearchResult;

import java.util.List;

public interface MarketDataProvider {
    Quote getQuote(String symbol);
    List<Quote> getQuotes(List<String> symbols);
    List<OhlcvBar> getOhlcv(String symbol, String interval, int bars);
    List<SearchResult> search(String query);
}
