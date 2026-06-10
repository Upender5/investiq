package com.investiq.fund.service.impl;

import com.investiq.fund.domain.entity.FundTransaction;
import com.investiq.fund.domain.entity.MutualFund;
import com.investiq.fund.domain.entity.SipMandate;
import com.investiq.fund.domain.enums.SipStatus;
import com.investiq.fund.domain.enums.TransactionStatus;
import com.investiq.fund.domain.repository.FundTransactionRepository;
import com.investiq.fund.domain.repository.MutualFundRepository;
import com.investiq.fund.domain.repository.SipMandateRepository;
import com.investiq.fund.dto.request.SipRequest;
import com.investiq.fund.dto.response.SipResponse;
import com.investiq.fund.exception.FundException;
import com.investiq.fund.kafka.FundEventPublisher;
import com.investiq.fund.kafka.event.SipCreatedEvent;
import com.investiq.fund.kafka.event.SipStatusChangedEvent;
import com.investiq.fund.service.SipService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SipServiceImpl implements SipService {

    private static final BigDecimal MIN_SIP = new BigDecimal("100");

    private final SipMandateRepository sipRepo;
    private final MutualFundRepository fundRepo;
    private final FundTransactionRepository txnRepo;
    private final FundEventPublisher eventPublisher;

    @Override
    @Transactional
    public SipResponse createSip(UUID userId, SipRequest request) {
        MutualFund fund = fundRepo.findById(request.schemeCode())
            .orElseThrow(() -> FundException.notFound(request.schemeCode()));

        if (!fund.isActive()) throw FundException.fundInactive(fund.getSchemeCode());

        BigDecimal minSip = fund.getMinSip() != null ? fund.getMinSip() : MIN_SIP;
        if (request.monthlyAmount().compareTo(minSip) < 0)
            throw FundException.belowMinimum("monthlyAmount", "₹" + minSip);

        LocalDate nextInstalment = calculateNextInstalment(request.startDate(), request.sipDate());

        String folioNumber = request.folioNumber() != null ? request.folioNumber()
            : "IQ" + userId.toString().substring(0, 8).toUpperCase() + System.currentTimeMillis() % 100000;

        SipMandate mandate = SipMandate.builder()
            .userId(userId)
            .schemeCode(request.schemeCode())
            .folioNumber(folioNumber)
            .monthlyAmount(request.monthlyAmount())
            .sipDate(request.sipDate())
            .status(SipStatus.ACTIVE)
            .bankAccountId(request.bankAccountId())
            .startDate(request.startDate())
            .endDate(request.endDate())
            .nextInstalment(nextInstalment)
            .completedInstalments(0)
            .totalInvested(BigDecimal.ZERO)
            .build();
        mandate = sipRepo.save(mandate);

        eventPublisher.publishSipCreated(new SipCreatedEvent(
            mandate.getId(), userId, request.schemeCode(), request.monthlyAmount(),
            request.sipDate(), request.startDate(), request.endDate(),
            request.bankAccountId(), folioNumber, Instant.now()
        ));

        log.info("SIP created: sip={} user={} scheme={} amount={}",
            mandate.getId(), userId, request.schemeCode(), request.monthlyAmount());

        return toResponse(mandate, fund);
    }

    @Override
    public List<SipResponse> listSips(UUID userId) {
        return sipRepo.findByUserIdAndStatusNot(userId, SipStatus.CANCELLED).stream()
            .map(m -> {
                MutualFund fund = fundRepo.findById(m.getSchemeCode()).orElse(null);
                return toResponse(m, fund);
            })
            .toList();
    }

    @Override
    public SipResponse getSip(UUID userId, UUID sipId) {
        SipMandate mandate = sipRepo.findByIdAndUserId(sipId, userId)
            .orElseThrow(() -> FundException.sipNotFound(sipId.toString()));
        MutualFund fund = fundRepo.findById(mandate.getSchemeCode()).orElse(null);
        return toResponse(mandate, fund);
    }

    @Override
    @Transactional
    public SipResponse updateSip(UUID userId, UUID sipId, SipRequest request) {
        SipMandate mandate = sipRepo.findByIdAndUserId(sipId, userId)
            .orElseThrow(() -> FundException.sipNotFound(sipId.toString()));

        if (mandate.getStatus() == SipStatus.CANCELLED)
            throw FundException.sipAlreadyCancelled(sipId.toString());

        String oldStatus = mandate.getStatus().name();

        // Allow updating amount and toggling pause/resume
        if (request.monthlyAmount() != null && request.monthlyAmount().compareTo(MIN_SIP) >= 0) {
            mandate.setMonthlyAmount(request.monthlyAmount());
        }
        if (request.endDate() != null) {
            mandate.setEndDate(request.endDate());
        }

        // Toggle status: ACTIVE -> PAUSED or PAUSED -> ACTIVE
        SipStatus newStatus = mandate.getStatus() == SipStatus.ACTIVE ? SipStatus.PAUSED : SipStatus.ACTIVE;
        mandate.setStatus(newStatus);

        if (newStatus == SipStatus.ACTIVE) {
            mandate.setNextInstalment(calculateNextInstalment(LocalDate.now(), mandate.getSipDate()));
        }

        mandate = sipRepo.save(mandate);

        eventPublisher.publishSipStatusChanged(new SipStatusChangedEvent(
            mandate.getId(), userId, mandate.getSchemeCode(),
            oldStatus, mandate.getStatus().name(), Instant.now()
        ));

        MutualFund fund = fundRepo.findById(mandate.getSchemeCode()).orElse(null);
        return toResponse(mandate, fund);
    }

    @Override
    @Transactional
    public void cancelSip(UUID userId, UUID sipId) {
        SipMandate mandate = sipRepo.findByIdAndUserId(sipId, userId)
            .orElseThrow(() -> FundException.sipNotFound(sipId.toString()));

        if (mandate.getStatus() == SipStatus.CANCELLED)
            throw FundException.sipAlreadyCancelled(sipId.toString());

        String oldStatus = mandate.getStatus().name();
        mandate.setStatus(SipStatus.CANCELLED);
        mandate.setNextInstalment(null);
        sipRepo.save(mandate);

        eventPublisher.publishSipStatusChanged(new SipStatusChangedEvent(
            mandate.getId(), userId, mandate.getSchemeCode(),
            oldStatus, SipStatus.CANCELLED.name(), Instant.now()
        ));

        log.info("SIP cancelled: sip={} user={}", sipId, userId);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private LocalDate calculateNextInstalment(LocalDate startDate, int sipDate) {
        LocalDate today = LocalDate.now();
        LocalDate candidate = startDate.isAfter(today) ? startDate : today;
        // Move to the next occurrence of sipDate >= candidate
        LocalDate next = candidate.withDayOfMonth(Math.min(sipDate, candidate.lengthOfMonth()));
        if (!next.isAfter(candidate.minusDays(1))) {
            next = next.plusMonths(1);
            next = next.withDayOfMonth(Math.min(sipDate, next.lengthOfMonth()));
        }
        return next;
    }

    private BigDecimal calculateCurrentValue(SipMandate mandate, MutualFund fund) {
        if (fund == null || fund.getNav() == null || mandate.getTotalInvested() == null
            || mandate.getTotalInvested().compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;

        List<FundTransaction> sipTxns = txnRepo.findBySipMandateId(mandate.getId());
        BigDecimal totalUnits = sipTxns.stream()
            .filter(t -> t.getStatus() == TransactionStatus.ALLOTTED && t.getUnits() != null)
            .map(FundTransaction::getUnits)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return totalUnits.multiply(fund.getNav()).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateSipXirr(SipMandate mandate, BigDecimal currentValue) {
        List<FundTransaction> sipTxns = txnRepo.findBySipMandateId(mandate.getId());
        if (sipTxns.isEmpty()) return BigDecimal.ZERO;

        // Simple CAGR approximation for SIP
        BigDecimal totalInvested = mandate.getTotalInvested();
        if (totalInvested == null || totalInvested.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        if (currentValue.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;

        // Years = completed instalments / 12
        double years = mandate.getCompletedInstalments() / 12.0;
        if (years < 0.01) return BigDecimal.ZERO;

        double ratio = currentValue.doubleValue() / totalInvested.doubleValue();
        double cagr = (Math.pow(ratio, 1.0 / years) - 1.0) * 100;
        return BigDecimal.valueOf(cagr).setScale(2, RoundingMode.HALF_UP);
    }

    private SipResponse toResponse(SipMandate m, MutualFund fund) {
        BigDecimal currentValue = calculateCurrentValue(m, fund);
        BigDecimal xirr = calculateSipXirr(m, currentValue);
        return new SipResponse(
            m.getId(),
            m.getSchemeCode(),
            fund != null ? fund.getSchemeName() : m.getSchemeCode(),
            m.getMonthlyAmount(),
            m.getSipDate(),
            m.getStatus().name(),
            m.getStartDate(),
            m.getEndDate(),
            m.getNextInstalment(),
            m.getCompletedInstalments(),
            m.getTotalInvested() != null ? m.getTotalInvested() : BigDecimal.ZERO,
            currentValue,
            xirr,
            m.getFolioNumber(),
            m.getCreatedAt()
        );
    }
}
