package com.investiq.marketdata.controller;

import com.investiq.marketdata.model.OhlcvBar;
import com.investiq.marketdata.model.Quote;
import com.investiq.marketdata.model.SearchResult;
import com.investiq.marketdata.service.MarketDataService;
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
public class MarketDataController {

    private final MarketDataService marketDataService;

    @GetMapping("/quotes/{symbol}")
    public Quote getQuote(@PathVariable String symbol) {
        return marketDataService.getQuote(symbol);
    }

    @PostMapping("/quotes/batch")
    public List<Quote> getQuotes(@RequestBody @jakarta.validation.Valid List<@NotBlank String> symbols) {
        if (symbols.size() > 50) symbols = symbols.subList(0, 50);
        return marketDataService.getQuotes(symbols);
    }

    @GetMapping("/search")
    public List<SearchResult> search(@RequestParam String q) {
        return marketDataService.search(q);
    }

    @GetMapping("/quotes/{symbol}/ohlcv")
    public List<OhlcvBar> getOhlcv(@PathVariable String symbol,
                                   @RequestParam(defaultValue = "5m") String interval,
                                   @RequestParam(defaultValue = "100") @Min(1) @Max(500) int bars) {
        return marketDataService.getOhlcv(symbol, interval, bars);
    }
}
