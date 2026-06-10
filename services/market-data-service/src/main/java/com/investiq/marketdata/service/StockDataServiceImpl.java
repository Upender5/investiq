package com.investiq.marketdata.service;

import com.investiq.marketdata.controller.MarketStatusResponse;
import com.investiq.marketdata.dto.*;
import com.investiq.marketdata.model.Quote;
import com.investiq.marketdata.provider.MarketDataProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StockDataServiceImpl implements StockDataService {

    private static final Map<String, StockMeta> STOCK_META = buildMeta();
    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private final MarketDataProvider provider;
    private final QuoteCacheService quoteCache;

    @Override
    public Page<StockDetail> listStocks(String sector, String exchange, Boolean fnOEnabled, Pageable pageable) {
        List<StockDetail> all = STOCK_META.values().stream()
                .filter(m -> sector == null || sector.isBlank() || sector.equalsIgnoreCase(m.sector()))
                .filter(m -> exchange == null || exchange.isBlank() || exchange.equalsIgnoreCase(m.exchange()))
                .filter(m -> fnOEnabled == null || fnOEnabled == m.fnO())
                .map(this::toStockDetail)
                .collect(Collectors.toList());
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        return new PageImpl<>(all.subList(start, end), pageable, all.size());
    }

    @Override
    public StockDetail getStock(String symbol) {
        StockMeta meta = STOCK_META.get(symbol.toUpperCase());
        if (meta == null) throw new NoSuchElementException("Symbol not found: " + symbol);
        return toStockDetail(meta);
    }

    @Override
    public List<TopMoverResponse> getTopGainers(String exchange, String index, int limit) {
        return STOCK_META.keySet().stream()
                .map(s -> quoteWithMeta(s))
                .filter(Objects::nonNull)
                .filter(p -> p.quote().changePercent().compareTo(BigDecimal.ZERO) > 0)
                .sorted(Comparator.comparing(p -> p.quote().changePercent(), Comparator.reverseOrder()))
                .limit(limit)
                .map(this::toTopMover)
                .toList();
    }

    @Override
    public List<TopMoverResponse> getTopLosers(String exchange, String index, int limit) {
        return STOCK_META.keySet().stream()
                .map(s -> quoteWithMeta(s))
                .filter(Objects::nonNull)
                .filter(p -> p.quote().changePercent().compareTo(BigDecimal.ZERO) < 0)
                .sorted(Comparator.comparing(p -> p.quote().changePercent()))
                .limit(limit)
                .map(this::toTopMover)
                .toList();
    }

    @Override
    public List<TopMoverResponse> get52WeekHighs(int limit) {
        return STOCK_META.keySet().stream()
                .map(s -> quoteWithMeta(s))
                .filter(Objects::nonNull)
                .filter(p -> p.quote().changePercent().compareTo(BigDecimal.valueOf(1.5)) > 0)
                .limit(limit)
                .map(this::toTopMover)
                .toList();
    }

    @Override
    public List<TopMoverResponse> get52WeekLows(int limit) {
        return STOCK_META.keySet().stream()
                .map(s -> quoteWithMeta(s))
                .filter(Objects::nonNull)
                .filter(p -> p.quote().changePercent().compareTo(BigDecimal.valueOf(-1.5)) < 0)
                .limit(limit)
                .map(this::toTopMover)
                .toList();
    }

    @Override
    public FundamentalsResponse getFundamentals(String symbol) {
        ThreadLocalRandom rnd = ThreadLocalRandom.current();
        return new FundamentalsResponse(
                symbol.toUpperCase(),
                bd(rnd.nextDouble(10, 35)),   // PE
                bd(rnd.nextDouble(1, 8)),      // PB
                bd(rnd.nextDouble(20, 200)),   // EPS
                bd(rnd.nextDouble(100, 1000)), // bookValue
                bd(rnd.nextDouble(0.5, 4)),    // dividendYield
                bd(rnd.nextDouble(10, 30)),    // ROE
                bd(rnd.nextDouble(12, 28)),    // ROCE
                bd(rnd.nextDouble(0.1, 1.5)),  // D/E
                bd(rnd.nextDouble(1, 3)),      // current ratio
                bd(rnd.nextDouble(-5, 25)),    // revenue growth YoY
                bd(rnd.nextDouble(-10, 40)),   // profit growth YoY
                bd(rnd.nextDouble(40, 75)),    // promoter holding
                bd(rnd.nextDouble(5, 25)),     // FII
                bd(rnd.nextDouble(5, 20)),     // DII
                randomZone(rnd)
        );
    }

    @Override
    public TechnicalsResponse getTechnicals(String symbol, String timeframe) {
        Quote q = liveQuote(symbol);
        BigDecimal ltp = q.ltp();
        ThreadLocalRandom rnd = ThreadLocalRandom.current();
        BigDecimal rsi = bd(rnd.nextDouble(30, 75));
        String signal = rsi.compareTo(BigDecimal.valueOf(60)) > 0 ? "BUY"
                : rsi.compareTo(BigDecimal.valueOf(40)) < 0 ? "SELL" : "NEUTRAL";
        return new TechnicalsResponse(
                symbol.toUpperCase(),
                timeframe != null ? timeframe : "1D",
                signal,
                rsi,
                bd(rnd.nextDouble(-5, 5)),    // MACD
                bd(rnd.nextDouble(-3, 3)),     // signal
                bd(rnd.nextDouble(-2, 2)),     // histogram
                ltp.multiply(bd(0.97)),        // SMA20
                ltp.multiply(bd(0.95)),        // SMA50
                ltp.multiply(bd(0.90)),        // SMA200
                ltp.multiply(bd(0.98)),        // EMA20
                ltp.multiply(bd(1.04)),        // BB upper
                ltp.multiply(bd(0.96)),        // BB lower
                ltp,                           // BB middle
                bd(rnd.nextDouble(10, 50)),    // ATR
                bd(rnd.nextDouble(500_000, 2_000_000)), // vol 20d avg
                List.of(
                        new TechnicalsResponse.SupportResistance(ltp.multiply(bd(0.95)), "STRONG"),
                        new TechnicalsResponse.SupportResistance(ltp.multiply(bd(0.92)), "MODERATE")),
                List.of(
                        new TechnicalsResponse.SupportResistance(ltp.multiply(bd(1.05)), "STRONG"),
                        new TechnicalsResponse.SupportResistance(ltp.multiply(bd(1.08)), "MODERATE"))
        );
    }

    @Override
    public List<NewsItem> getNews(String symbol, int limit) {
        List<String> headlines = List.of(
                "Quarterly results beat analyst estimates",
                "Management guidance upgraded for FY27",
                "Institutional investors increase stake",
                "Board approves share buyback programme",
                "New product line drives revenue growth",
                "International expansion announced"
        );
        List<NewsItem> items = new ArrayList<>();
        for (int i = 0; i < Math.min(limit, headlines.size()); i++) {
            items.add(new NewsItem(
                    UUID.randomUUID().toString(),
                    symbol.toUpperCase() + ": " + headlines.get(i),
                    "Detailed analysis of " + headlines.get(i).toLowerCase() + ".",
                    "https://example.com/news/" + i,
                    "Market Pulse",
                    i % 3 == 0 ? "NEGATIVE" : "POSITIVE",
                    i % 3 == 0 ? -0.4 : 0.7,
                    List.of(symbol.toUpperCase()),
                    Instant.now().minusSeconds((long) i * 3600)
            ));
        }
        return items;
    }

    @Override
    public Object getFinancials(String symbol, String period, int count) {
        return Map.of("symbol", symbol, "period", period != null ? period : "QUARTERLY",
                "data", List.of(
                        Map.of("period", "Q1FY27", "revenue", 150_000_000_000L, "netProfit", 18_000_000_000L),
                        Map.of("period", "Q4FY26", "revenue", 142_000_000_000L, "netProfit", 16_500_000_000L),
                        Map.of("period", "Q3FY26", "revenue", 138_000_000_000L, "netProfit", 15_800_000_000L)
                ));
    }

    @Override
    public List<CorporateActionResponse> getCorporateActions(String symbol, int months) {
        return List.of(new CorporateActionResponse(
                symbol.toUpperCase(), "DIVIDEND", "Final Dividend",
                BigDecimal.valueOf(10), LocalDate.now().plusDays(30),
                LocalDate.now().plusDays(32), LocalDate.now().plusDays(45),
                "Annual dividend approved by board"));
    }

    @Override
    public MarketStatusResponse getMarketStatus() {
        ZonedDateTime now = ZonedDateTime.now(IST);
        int hour = now.getHour();
        int minute = now.getMinute();
        int totalMinutes = hour * 60 + minute;
        boolean isWeekend = now.getDayOfWeek() == DayOfWeek.SATURDAY || now.getDayOfWeek() == DayOfWeek.SUNDAY;
        boolean preOpen = !isWeekend && totalMinutes >= 555 && totalMinutes < 570; // 9:15–9:30
        boolean normal = !isWeekend && totalMinutes >= 570 && totalMinutes < 930;   // 9:30–15:30
        boolean postClose = !isWeekend && totalMinutes >= 930 && totalMinutes < 960; // 15:30–16:00
        boolean nseOpen = preOpen || normal;
        String session = preOpen ? "PRE_OPEN" : normal ? "NORMAL" : postClose ? "POST_CLOSE" : "AFTER_HOURS";
        ZonedDateTime nextOpen = now.toLocalDate().atTime(9, 15).atZone(IST);
        if (!nseOpen) nextOpen = nextOpen.plusDays(isWeekend ? (now.getDayOfWeek() == DayOfWeek.SATURDAY ? 2 : 1) : 1);
        ZonedDateTime closes = now.toLocalDate().atTime(15, 30).atZone(IST);
        return new MarketStatusResponse(nseOpen, nseOpen, session,
                nextOpen.toInstant(), closes.toInstant());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private Quote liveQuote(String symbol) {
        return quoteCache.getCachedQuote(symbol)
                .orElseGet(() -> {
                    Quote q = provider.getQuote(symbol);
                    quoteCache.cacheQuote(q);
                    return q;
                });
    }

    private record QuoteWithMeta(Quote quote, StockMeta meta) {}

    private QuoteWithMeta quoteWithMeta(String symbol) {
        StockMeta meta = STOCK_META.get(symbol);
        if (meta == null) return null;
        Quote q = liveQuote(symbol);
        return new QuoteWithMeta(q, meta);
    }

    private TopMoverResponse toTopMover(QuoteWithMeta p) {
        return new TopMoverResponse(p.quote().symbol(), p.meta().name(),
                p.quote().ltp(), p.quote().change(), p.quote().changePercent(),
                p.quote().volume(), p.meta().marketCap(), p.meta().sector());
    }

    private StockDetail toStockDetail(StockMeta m) {
        return new StockDetail(m.symbol(), m.name(), m.exchange(), m.sector(),
                m.industry(), m.isin(), "EQ", BigDecimal.ONE,
                m.marketCap(), m.marketCap() / 1000, m.fnO(), m.nifty50(), m.nifty500());
    }

    private static BigDecimal bd(double v) {
        return BigDecimal.valueOf(v).setScale(2, RoundingMode.HALF_UP);
    }

    private static String randomZone(ThreadLocalRandom rnd) {
        String[] zones = {"FAIR", "OVERVALUED", "UNDERVALUED"};
        return zones[rnd.nextInt(zones.length)];
    }

    private static StockMeta defaultMeta(String symbol) {
        return new StockMeta(symbol, symbol, "NSE", "UNKNOWN", "UNKNOWN",
                "INE000000000", 0L, false, false, false);
    }

    // ── Static metadata registry ──────────────────────────────────────────────

    private static Map<String, StockMeta> buildMeta() {
        Map<String, StockMeta> m = new LinkedHashMap<>();
        m.put("RELIANCE",   new StockMeta("RELIANCE",   "Reliance Industries",      "NSE", "ENERGY",           "OIL_GAS",        "INE002A01018", 1_650_000_000_000L, true,  true,  true));
        m.put("TCS",        new StockMeta("TCS",        "Tata Consultancy Services", "NSE", "IT",               "IT_SERVICES",    "INE467B01029",   960_000_000_000L, true,  true,  true));
        m.put("INFY",       new StockMeta("INFY",       "Infosys",                  "NSE", "IT",               "IT_SERVICES",    "INE009A01021",   640_000_000_000L, true,  true,  true));
        m.put("HDFCBANK",   new StockMeta("HDFCBANK",   "HDFC Bank",                "NSE", "BANKING",          "PRIVATE_BANK",   "INE040A01034", 1_180_000_000_000L, true,  true,  true));
        m.put("SBIN",       new StockMeta("SBIN",       "State Bank of India",      "NSE", "BANKING",          "PUBLIC_BANK",    "INE062A01020",   560_000_000_000L, true,  true,  true));
        m.put("WIPRO",      new StockMeta("WIPRO",      "Wipro",                    "NSE", "IT",               "IT_SERVICES",    "INE075A01022",   250_000_000_000L, true,  false, true));
        m.put("ICICIBANK",  new StockMeta("ICICIBANK",  "ICICI Bank",               "NSE", "BANKING",          "PRIVATE_BANK",   "INE090A01021",   760_000_000_000L, true,  true,  true));
        m.put("BAJFINANCE", new StockMeta("BAJFINANCE", "Bajaj Finance",            "NSE", "FINANCE",          "NBFC",           "INE296A01024",   440_000_000_000L, true,  true,  true));
        m.put("MARUTI",     new StockMeta("MARUTI",     "Maruti Suzuki",            "NSE", "AUTOMOBILE",       "PASSENGER_CARS", "INE585B01010",   380_000_000_000L, true,  true,  true));
        m.put("ITC",        new StockMeta("ITC",        "ITC Limited",              "NSE", "FMCG",             "DIVERSIFIED",    "INE154A01025",   560_000_000_000L, true,  true,  true));
        return Collections.unmodifiableMap(m);
    }

    private record StockMeta(String symbol, String name, String exchange, String sector, String industry,
                              String isin, long marketCap, boolean fnO, boolean nifty50, boolean nifty500) {}
}
