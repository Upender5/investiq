package com.investiq.marketdata.service;

import com.investiq.marketdata.controller.MarketStatusResponse;
import com.investiq.marketdata.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface StockDataService {
    Page<StockDetail> listStocks(String sector, String exchange, Boolean fnOEnabled, Pageable pageable);
    StockDetail getStock(String symbol);
    List<TopMoverResponse> getTopGainers(String exchange, String index, int limit);
    List<TopMoverResponse> getTopLosers(String exchange, String index, int limit);
    List<TopMoverResponse> get52WeekHighs(int limit);
    List<TopMoverResponse> get52WeekLows(int limit);
    FundamentalsResponse getFundamentals(String symbol);
    TechnicalsResponse getTechnicals(String symbol, String timeframe);
    List<NewsItem> getNews(String symbol, int limit);
    Object getFinancials(String symbol, String period, int count);
    List<CorporateActionResponse> getCorporateActions(String symbol, int months);
    MarketStatusResponse getMarketStatus();
}
