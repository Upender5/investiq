package com.investiq.marketdata.controller;

import com.investiq.marketdata.dto.*;
import com.investiq.marketdata.service.StockDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/stocks")
@RequiredArgsConstructor
@Validated
@Tag(name = "Stocks", description = "Instrument listing, fundamentals, technicals, news and corporate actions")
public class StockController {

    private final StockDataService stockDataService;

    // ─── Listing ─────────────────────────────────────────────────────────────

    @GetMapping
    @Operation(summary = "Paginated list of all NSE/BSE instruments",
               description = "Supports ?sector=IT&exchange=NSE&page=0&size=50&sort=marketCap,desc")
    public Page<StockDetail> listStocks(
            @RequestParam(required = false) String sector,
            @RequestParam(required = false) String exchange,
            @RequestParam(required = false) Boolean fnOEnabled,
            @PageableDefault(size = 50) Pageable pageable) {
        return stockDataService.listStocks(sector, exchange, fnOEnabled, pageable);
    }

    @GetMapping("/{symbol}")
    @Operation(summary = "Get full instrument details for a symbol")
    public StockDetail getStock(@PathVariable String symbol) {
        return stockDataService.getStock(symbol);
    }

    // ─── Market Movers ───────────────────────────────────────────────────────

    @GetMapping("/top-gainers")
    @Operation(summary = "Top N gainers in the current session",
               description = "Supports ?exchange=NSE&index=NIFTY50&limit=10")
    public List<TopMoverResponse> topGainers(
            @RequestParam(defaultValue = "NSE") String exchange,
            @RequestParam(required = false) String index,
            @RequestParam(defaultValue = "20") int limit) {
        return stockDataService.getTopGainers(exchange, index, limit);
    }

    @GetMapping("/top-losers")
    @Operation(summary = "Top N losers in the current session")
    public List<TopMoverResponse> topLosers(
            @RequestParam(defaultValue = "NSE") String exchange,
            @RequestParam(required = false) String index,
            @RequestParam(defaultValue = "20") int limit) {
        return stockDataService.getTopLosers(exchange, index, limit);
    }

    @GetMapping("/52-week-high")
    @Operation(summary = "Stocks hitting 52-week highs today")
    public List<TopMoverResponse> week52High(@RequestParam(defaultValue = "20") int limit) {
        return stockDataService.get52WeekHighs(limit);
    }

    @GetMapping("/52-week-low")
    @Operation(summary = "Stocks hitting 52-week lows today")
    public List<TopMoverResponse> week52Low(@RequestParam(defaultValue = "20") int limit) {
        return stockDataService.get52WeekLows(limit);
    }

    // ─── Fundamentals ────────────────────────────────────────────────────────

    @GetMapping("/{symbol}/fundamentals")
    @Operation(summary = "P/E, P/B, EPS, ROE, promoter holding and valuation zone")
    public FundamentalsResponse getFundamentals(@PathVariable String symbol) {
        return stockDataService.getFundamentals(symbol);
    }

    // ─── Technicals ──────────────────────────────────────────────────────────

    @GetMapping("/{symbol}/technicals")
    @Operation(summary = "RSI, MACD, Bollinger Bands, moving averages and support/resistance levels",
               description = "Supports ?timeframe=1d (default 1d). Values: 15m, 1h, 1d, 1w")
    public TechnicalsResponse getTechnicals(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1d") String timeframe) {
        return stockDataService.getTechnicals(symbol, timeframe);
    }

    // ─── News ────────────────────────────────────────────────────────────────

    @GetMapping("/{symbol}/news")
    @Operation(summary = "Latest news items for a stock with sentiment tags")
    public List<NewsItem> getNews(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "10") int limit) {
        return stockDataService.getNews(symbol, limit);
    }

    // ─── Financials ──────────────────────────────────────────────────────────

    @GetMapping("/{symbol}/financials")
    @Operation(summary = "Quarterly/annual income statement, balance sheet and cash flow",
               description = "Supports ?period=QUARTERLY&count=8 or ?period=ANNUAL&count=5")
    public Object getFinancials(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "QUARTERLY") String period,
            @RequestParam(defaultValue = "8") int count) {
        return stockDataService.getFinancials(symbol, period, count);
    }

    // ─── Corporate Actions ───────────────────────────────────────────────────

    @GetMapping("/{symbol}/corporate-actions")
    @Operation(summary = "Upcoming and historical dividends, bonuses, splits and buybacks")
    public List<CorporateActionResponse> getCorporateActions(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "12") int months) {
        return stockDataService.getCorporateActions(symbol, months);
    }
}
