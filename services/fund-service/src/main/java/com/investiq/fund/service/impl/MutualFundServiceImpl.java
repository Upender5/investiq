package com.investiq.fund.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.investiq.fund.domain.entity.FundHolding;
import com.investiq.fund.domain.entity.FundTransaction;
import com.investiq.fund.domain.entity.MutualFund;
import com.investiq.fund.domain.enums.TransactionStatus;
import com.investiq.fund.domain.enums.TransactionType;
import com.investiq.fund.domain.repository.FundHoldingRepository;
import com.investiq.fund.domain.repository.FundTransactionRepository;
import com.investiq.fund.domain.repository.MutualFundRepository;
import com.investiq.fund.dto.request.InvestRequest;
import com.investiq.fund.dto.request.RedemptionRequest;
import com.investiq.fund.dto.response.*;
import com.investiq.fund.exception.FundException;
import com.investiq.fund.kafka.FundEventPublisher;
import com.investiq.fund.kafka.event.FundInvestedEvent;
import com.investiq.fund.kafka.event.FundRedeemedEvent;
import com.investiq.fund.service.MutualFundService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MutualFundServiceImpl implements MutualFundService {

    private final MutualFundRepository fundRepo;
    private final FundHoldingRepository holdingRepo;
    private final FundTransactionRepository txnRepo;
    private final FundEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    // ─── Fund Discovery ───────────────────────────────────────────────────────

    @Override
    public Page<MutualFundSummary> listFunds(String category, String risk, String amc,
                                              String subCategory, Pageable pageable) {
        return fundRepo.findWithFilters(category, risk, amc, subCategory, pageable)
                       .map(this::toSummary);
    }

    @Override
    public MutualFundDetail getFund(String schemeCode) {
        MutualFund fund = fundRepo.findById(schemeCode)
            .orElseThrow(() -> FundException.notFound(schemeCode));
        return toDetail(fund);
    }

    @Override
    public List<MutualFundSummary> searchFunds(String query) {
        if (query == null || query.isBlank()) return List.of();
        return fundRepo.searchFunds(query.trim())
                       .stream()
                       .map(this::toSummary)
                       .toList();
    }

    @Override
    public List<MutualFundSummary> getTopRatedFunds(String category, int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        return fundRepo.findTopRated(category, PageRequest.of(0, safeLimit))
                       .stream()
                       .map(this::toSummary)
                       .toList();
    }

    // ─── Investment ───────────────────────────────────────────────────────────

    @Override
    @Transactional
    public InvestmentResponse invest(UUID userId, InvestRequest request) {
        MutualFund fund = fundRepo.findById(request.schemeCode())
            .orElseThrow(() -> FundException.notFound(request.schemeCode()));

        if (!fund.isActive()) throw FundException.fundInactive(fund.getSchemeCode());

        BigDecimal minInvest = fund.getMinInvestment() != null ? fund.getMinInvestment() : new BigDecimal("500");
        if (request.amount().compareTo(minInvest) < 0)
            throw FundException.belowMinimum("amount", "₹" + minInvest);

        BigDecimal currentNav = fund.getNav() != null ? fund.getNav() : BigDecimal.ONE;
        BigDecimal estimatedUnits = request.amount().divide(currentNav, 4, RoundingMode.HALF_UP);

        String folioNumber = resolveFolio(userId, request.schemeCode(), request.folioNumber());

        FundTransaction txn = FundTransaction.builder()
            .userId(userId)
            .schemeCode(request.schemeCode())
            .folioNumber(folioNumber)
            .type(TransactionType.INVEST)
            .amount(request.amount())
            .units(estimatedUnits)
            .nav(currentNav)
            .bankAccountId(request.bankAccountId())
            .status(TransactionStatus.SUBMITTED)
            .build();
        txn = txnRepo.save(txn);

        // Update or create holding (optimistic — assume fund will be allotted)
        updateHolding(userId, request.schemeCode(), folioNumber, estimatedUnits, currentNav, request.amount());

        // Publish Kafka event for wallet debit and notification
        eventPublisher.publishFundInvested(new FundInvestedEvent(
            txn.getId(), userId, fund.getSchemeCode(), fund.getSchemeName(),
            request.amount(), estimatedUnits, folioNumber,
            request.bankAccountId(), Instant.now()
        ));

        log.info("Fund investment submitted: txn={} user={} scheme={} amount={}",
            txn.getId(), userId, request.schemeCode(), request.amount());

        return new InvestmentResponse(
            txn.getId(), fund.getSchemeCode(), fund.getSchemeName(),
            request.amount(), estimatedUnits, txn.getStatus().name(),
            folioNumber, txn.getCreatedAt()
        );
    }

    // ─── Redemption ───────────────────────────────────────────────────────────

    @Override
    @Transactional
    public RedemptionResponse redeem(UUID userId, String schemeCode, RedemptionRequest request) {
        if (!request.redeemAll() && request.units() == null && request.amount() == null)
            throw FundException.invalidRedemption();

        MutualFund fund = fundRepo.findById(schemeCode)
            .orElseThrow(() -> FundException.notFound(schemeCode));

        FundHolding holding = holdingRepo.findFirstByUserIdAndSchemeCode(userId, schemeCode)
            .orElseThrow(() -> FundException.holdingNotFound(schemeCode));

        BigDecimal currentNav = fund.getNav() != null ? fund.getNav() : BigDecimal.ONE;
        BigDecimal unitsToRedeem;
        BigDecimal redemptionAmount;

        if (request.redeemAll()) {
            unitsToRedeem = holding.getUnits();
            redemptionAmount = unitsToRedeem.multiply(currentNav).setScale(2, RoundingMode.HALF_UP);
        } else if (request.units() != null) {
            unitsToRedeem = request.units();
            redemptionAmount = unitsToRedeem.multiply(currentNav).setScale(2, RoundingMode.HALF_UP);
        } else {
            redemptionAmount = request.amount();
            unitsToRedeem = redemptionAmount.divide(currentNav, 4, RoundingMode.HALF_UP);
        }

        if (holding.getUnits().compareTo(unitsToRedeem) < 0)
            throw FundException.insufficientUnits(schemeCode);

        // Debit units from holding
        BigDecimal remainingUnits = holding.getUnits().subtract(unitsToRedeem);
        BigDecimal newInvested = remaining(holding.getInvestedAmount(), holding.getUnits(), unitsToRedeem);
        holding.setUnits(remainingUnits);
        holding.setInvestedAmount(newInvested);
        holdingRepo.save(holding);

        Instant estimatedCredit = Instant.now().plus(3, ChronoUnit.DAYS);

        FundTransaction txn = FundTransaction.builder()
            .userId(userId)
            .schemeCode(schemeCode)
            .folioNumber(holding.getFolioNumber())
            .type(TransactionType.REDEEM)
            .amount(redemptionAmount)
            .units(unitsToRedeem)
            .nav(currentNav)
            .bankAccountId(request.bankAccountId())
            .status(TransactionStatus.PROCESSING)
            .build();
        txn = txnRepo.save(txn);

        eventPublisher.publishFundRedeemed(new FundRedeemedEvent(
            txn.getId(), userId, schemeCode, unitsToRedeem, redemptionAmount,
            currentNav, request.bankAccountId(), estimatedCredit, Instant.now()
        ));

        log.info("Fund redemption submitted: txn={} user={} scheme={} units={}",
            txn.getId(), userId, schemeCode, unitsToRedeem);

        return new RedemptionResponse(
            txn.getId(), schemeCode, unitsToRedeem, redemptionAmount,
            currentNav, txn.getStatus().name(), estimatedCredit, txn.getCreatedAt()
        );
    }

    // ─── Holdings ─────────────────────────────────────────────────────────────

    @Override
    public List<FundHoldingResponse> getHoldings(UUID userId) {
        List<FundHolding> holdings = holdingRepo.findByUserIdAndUnitsGreaterThan(userId, BigDecimal.ZERO);
        List<FundHoldingResponse> responses = new ArrayList<>();

        for (FundHolding h : holdings) {
            MutualFund fund = fundRepo.findById(h.getSchemeCode()).orElse(null);
            BigDecimal currentNav = (fund != null && fund.getNav() != null) ? fund.getNav() : h.getAvgNav();
            BigDecimal currentValue = h.getUnits().multiply(currentNav).setScale(2, RoundingMode.HALF_UP);
            BigDecimal absoluteReturn = currentValue.subtract(h.getInvestedAmount());
            BigDecimal returnPct = h.getInvestedAmount().compareTo(BigDecimal.ZERO) > 0
                ? absoluteReturn.divide(h.getInvestedAmount(), 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;

            BigDecimal xirr = calculateXirr(userId, h.getSchemeCode(), currentValue);

            responses.add(new FundHoldingResponse(
                h.getSchemeCode(),
                fund != null ? fund.getSchemeName() : h.getSchemeCode(),
                fund != null ? fund.getAmc() : "",
                h.getFolioNumber(),
                h.getUnits(),
                h.getAvgNav(),
                currentNav,
                h.getInvestedAmount(),
                currentValue,
                absoluteReturn,
                returnPct.setScale(2, RoundingMode.HALF_UP),
                xirr,
                h.getFirstInvestmentDate()
            ));
        }
        return responses;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private String resolveFolio(UUID userId, String schemeCode, String requested) {
        if (requested != null && !requested.isBlank()) return requested;
        return holdingRepo.findFirstByUserIdAndSchemeCode(userId, schemeCode)
            .map(FundHolding::getFolioNumber)
            .orElseGet(() -> generateFolioNumber(userId));
    }

    private String generateFolioNumber(UUID userId) {
        String shortId = userId.toString().substring(0, 8).toUpperCase();
        return "IQ" + shortId + System.currentTimeMillis() % 100000;
    }

    private void updateHolding(UUID userId, String schemeCode, String folioNumber,
                                BigDecimal newUnits, BigDecimal nav, BigDecimal amount) {
        FundHolding holding = holdingRepo
            .findByUserIdAndSchemeCodeAndFolioNumber(userId, schemeCode, folioNumber)
            .orElseGet(() -> FundHolding.builder()
                .userId(userId)
                .schemeCode(schemeCode)
                .folioNumber(folioNumber)
                .units(BigDecimal.ZERO)
                .avgNav(BigDecimal.ZERO)
                .investedAmount(BigDecimal.ZERO)
                .firstInvestmentDate(LocalDate.now())
                .build());

        // Weighted average NAV = (existingUnits * existingAvgNav + newUnits * nav) / totalUnits
        BigDecimal totalUnits = holding.getUnits().add(newUnits);
        if (totalUnits.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal newAvgNav = (holding.getUnits().multiply(holding.getAvgNav())
                .add(newUnits.multiply(nav)))
                .divide(totalUnits, 4, RoundingMode.HALF_UP);
            holding.setAvgNav(newAvgNav);
        }
        holding.setUnits(totalUnits);
        holding.setInvestedAmount(holding.getInvestedAmount().add(amount));
        holdingRepo.save(holding);
    }

    private BigDecimal remaining(BigDecimal totalInvested, BigDecimal totalUnits, BigDecimal redeemedUnits) {
        if (totalUnits.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return totalInvested.multiply(
            BigDecimal.ONE.subtract(redeemedUnits.divide(totalUnits, 8, RoundingMode.HALF_UP))
        ).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateXirr(UUID userId, String schemeCode, BigDecimal currentValue) {
        List<FundTransaction> txns = txnRepo
            .findByUserIdAndSchemeCodeOrderByCreatedAtAsc(userId, schemeCode);
        if (txns.isEmpty()) return BigDecimal.ZERO;

        // Build cash flows: negative = investment, positive = current value
        record CashFlow(LocalDate date, double amount) {}
        List<CashFlow> flows = new ArrayList<>();
        for (FundTransaction t : txns) {
            if (t.getType() == TransactionType.INVEST || t.getType() == TransactionType.SIP) {
                flows.add(new CashFlow(
                    t.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate(),
                    -t.getAmount().doubleValue()
                ));
            }
        }
        // Add current value as the final positive cash flow
        flows.add(new CashFlow(LocalDate.now(), currentValue.doubleValue()));

        if (flows.size() < 2) return BigDecimal.ZERO;

        LocalDate baseDate = flows.get(0).date();
        double rate = 0.1;

        for (int iter = 0; iter < 200; iter++) {
            double npv = 0, dnpv = 0;
            for (CashFlow cf : flows) {
                double t = (double) ChronoUnit.DAYS.between(baseDate, cf.date()) / 365.0;
                double factor = Math.pow(1.0 + rate, t);
                npv  +=  cf.amount() / factor;
                dnpv -= t * cf.amount() / (factor * (1.0 + rate));
            }
            if (Math.abs(npv) < 1e-6) break;
            if (Math.abs(dnpv) < 1e-12) break;
            rate -= npv / dnpv;
            if (rate <= -1.0) rate = -0.999;
        }

        return BigDecimal.valueOf(rate * 100)
            .setScale(2, RoundingMode.HALF_UP);
    }

    private MutualFundSummary toSummary(MutualFund f) {
        return new MutualFundSummary(
            f.getSchemeCode(), f.getSchemeName(), f.getAmc(),
            f.getCategory(), f.getSubCategory(), f.getRiskLevel(),
            f.getNav(), f.getNavDate(),
            f.getReturns1y(), f.getReturns3y(), f.getReturns5y(),
            f.getAum(), f.getCrisilRating(), f.getExpenseRatio(),
            f.getMinInvestment()
        );
    }

    private MutualFundDetail toDetail(MutualFund f) {
        List<MutualFundDetail.HoldingSummary> holdings = parseHoldings(f.getTopHoldingsJson());
        List<MutualFundDetail.SectorAllocation> sectors = parseSectors(f.getSectorAllocationJson());
        return new MutualFundDetail(
            toSummary(f),
            f.getFundObjective(), f.getBenchmarkIndex(), f.getFundManager(),
            f.getInceptionDate(), f.getReturns10y(),
            f.getStandardDeviation(), f.getSharpeRatio(), f.getBeta(), f.getAlpha(),
            f.getExitLoad(), f.getExitLoadPeriod(),
            holdings, sectors
        );
    }

    private List<MutualFundDetail.HoldingSummary> parseHoldings(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("Failed to parse top holdings JSON", e);
            return List.of();
        }
    }

    private List<MutualFundDetail.SectorAllocation> parseSectors(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("Failed to parse sector allocation JSON", e);
            return List.of();
        }
    }
}
