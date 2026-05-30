package com.investiq.marketdata.provider;

import com.investiq.marketdata.model.OhlcvBar;
import com.investiq.marketdata.model.Quote;
import com.investiq.marketdata.model.SearchResult;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Component
@ConditionalOnProperty(name = "app.market.provider", havingValue = "mock", matchIfMissing = true)
public class MockMarketDataProvider implements MarketDataProvider {

    private static final Map<String, BigDecimal> BASE_PRICES = Map.of(
        "RELIANCE",   new BigDecimal("2450.00"),
        "TCS",        new BigDecimal("3800.00"),
        "INFY",       new BigDecimal("1600.00"),
        "HDFCBANK",   new BigDecimal("1550.00"),
        "SBIN",       new BigDecimal("620.00"),
        "WIPRO",      new BigDecimal("480.00"),
        "ICICIBANK",  new BigDecimal("1100.00"),
        "BAJFINANCE", new BigDecimal("7200.00"),
        "MARUTI",     new BigDecimal("12000.00"),
        "ITC",        new BigDecimal("450.00")
    );

    private static final List<SearchResult> INSTRUMENT_LIST = List.of(
        new SearchResult("RELIANCE",   "Reliance Industries",      "NSE", "EQ"),
        new SearchResult("TCS",        "Tata Consultancy Services", "NSE", "EQ"),
        new SearchResult("INFY",       "Infosys",                  "NSE", "EQ"),
        new SearchResult("HDFCBANK",   "HDFC Bank",                "NSE", "EQ"),
        new SearchResult("SBIN",       "State Bank of India",      "NSE", "EQ"),
        new SearchResult("WIPRO",      "Wipro",                    "NSE", "EQ"),
        new SearchResult("ICICIBANK",  "ICICI Bank",               "NSE", "EQ"),
        new SearchResult("BAJFINANCE", "Bajaj Finance",            "NSE", "EQ"),
        new SearchResult("MARUTI",     "Maruti Suzuki",            "NSE", "EQ"),
        new SearchResult("ITC",        "ITC Limited",              "NSE", "EQ")
    );

    @Override
    public Quote getQuote(String symbol) {
        BigDecimal base  = BASE_PRICES.getOrDefault(symbol.toUpperCase(), new BigDecimal("1000.00"));
        BigDecimal jitter = BigDecimal.valueOf(ThreadLocalRandom.current().nextDouble(-0.02, 0.02));
        BigDecimal ltp   = base.multiply(BigDecimal.ONE.add(jitter)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal change = ltp.subtract(base);
        BigDecimal pct   = change.divide(base, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
        return new Quote(symbol.toUpperCase(), "NSE", ltp, base, ltp, base, base,
            change, pct, ThreadLocalRandom.current().nextLong(100_000, 5_000_000), Instant.now());
    }

    @Override
    public List<Quote> getQuotes(List<String> symbols) {
        return symbols.stream().map(this::getQuote).toList();
    }

    @Override
    public List<OhlcvBar> getOhlcv(String symbol, String interval, int bars) {
        BigDecimal base = BASE_PRICES.getOrDefault(symbol.toUpperCase(), new BigDecimal("1000.00"));
        List<OhlcvBar> result = new ArrayList<>();
        Instant ts = Instant.now().truncatedTo(ChronoUnit.MINUTES);
        for (int i = bars - 1; i >= 0; i--) {
            double f = 1.0 + ThreadLocalRandom.current().nextDouble(-0.01, 0.01);
            BigDecimal close = base.multiply(BigDecimal.valueOf(f)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal open  = base.setScale(2, RoundingMode.HALF_UP);
            BigDecimal high  = close.max(open).add(BigDecimal.valueOf(ThreadLocalRandom.current().nextDouble(0, 5))).setScale(2, RoundingMode.HALF_UP);
            BigDecimal low   = close.min(open).subtract(BigDecimal.valueOf(ThreadLocalRandom.current().nextDouble(0, 5))).setScale(2, RoundingMode.HALF_UP);
            result.add(new OhlcvBar(symbol.toUpperCase(), ts.minus(i * 5, ChronoUnit.MINUTES), open, high, low, close,
                ThreadLocalRandom.current().nextLong(10_000, 500_000)));
            base = close;
        }
        return result;
    }

    @Override
    public List<SearchResult> search(String query) {
        String q = query.toLowerCase();
        return INSTRUMENT_LIST.stream()
            .filter(r -> r.symbol().toLowerCase().contains(q) || r.name().toLowerCase().contains(q))
            .toList();
    }
}
