package com.investiq.marketdata.controller;

import com.investiq.marketdata.model.OhlcvBar;
import com.investiq.marketdata.model.Quote;
import com.investiq.marketdata.model.SearchResult;
import com.investiq.marketdata.service.MarketDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/market")
@RequiredArgsConstructor
@Validated
@Tag(name = "Market Data", description = "Real-time quotes, OHLCV bars and symbol search")
public class MarketDataController {

    private final MarketDataService marketDataService;

    @GetMapping("/quotes/{symbol}")
    @Operation(summary = "Get real-time quote for a single symbol")
    public Quote getQuote(@PathVariable String symbol) {
        return marketDataService.getQuote(symbol);
    }

    @PostMapping("/quotes/batch")
    @Operation(summary = "Get real-time quotes for up to 50 symbols in one request")
    public List<Quote> getQuotes(@RequestBody @jakarta.validation.Valid List<@NotBlank String> symbols) {
        if (symbols.size() > 50) symbols = symbols.subList(0, 50);
        return marketDataService.getQuotes(symbols);
    }

    @GetMapping("/search")
    @Operation(summary = "Search symbols by name or ticker",
               description = "Returns up to 20 results. Use ?q=RELIANCE or ?q=Tata+Consultancy")
    public List<SearchResult> search(@RequestParam @NotBlank String q) {
        return marketDataService.search(q);
    }

    @GetMapping("/quotes/{symbol}/ohlcv")
    @Operation(summary = "Get OHLCV candle bars for charting",
               description = "interval: 1m, 3m, 5m, 15m, 30m, 1h, 1d, 1w, 1M")
    public List<OhlcvBar> getOhlcv(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "5m") String interval,
            @RequestParam(defaultValue = "100") @Min(1) @Max(500) int bars) {
        return marketDataService.getOhlcv(symbol, interval, bars);
    }

    @GetMapping("/status")
    @Operation(summary = "Market hours and session status for NSE and BSE")
    public MarketStatusResponse marketStatus() {
        return marketDataService.getMarketStatus();
    }
}
