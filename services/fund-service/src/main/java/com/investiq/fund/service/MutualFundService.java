package com.investiq.fund.service;

import com.investiq.fund.dto.request.InvestRequest;
import com.investiq.fund.dto.request.RedemptionRequest;
import com.investiq.fund.dto.response.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface MutualFundService {
    Page<MutualFundSummary> listFunds(String category, String risk, String amc, String subCategory, Pageable pageable);
    MutualFundDetail getFund(String schemeCode);
    List<MutualFundSummary> searchFunds(String query);
    List<MutualFundSummary> getTopRatedFunds(String category, int limit);
    InvestmentResponse invest(UUID userId, InvestRequest request);
    RedemptionResponse redeem(UUID userId, String schemeCode, RedemptionRequest request);
    List<FundHoldingResponse> getHoldings(UUID userId);
}
