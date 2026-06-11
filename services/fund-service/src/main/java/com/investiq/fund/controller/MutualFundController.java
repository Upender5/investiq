package com.investiq.fund.controller;

import com.investiq.fund.dto.request.InvestRequest;
import com.investiq.fund.dto.request.RedemptionRequest;
import com.investiq.fund.dto.request.SipRequest;
import com.investiq.fund.dto.response.*;
import com.investiq.fund.security.AuthenticatedUser;
import com.investiq.fund.service.MutualFundService;
import com.investiq.fund.service.SipService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Mutual Funds & SIPs", description = "Browse, invest in mutual funds and manage SIP mandates")
@SecurityRequirement(name = "bearerAuth")
public class MutualFundController {

    private final MutualFundService fundService;
    private final SipService sipService;

    // ─── Fund Discovery ───────────────────────────────────────────────────────

    @GetMapping("/mutual-funds")
    @Operation(summary = "Browse mutual funds with filters",
               description = "Supports ?category=EQUITY&risk=HIGH&amc=HDFC&sort=returns1y,desc&page=0&size=20")
    public Page<MutualFundSummary> listFunds(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String risk,
            @RequestParam(required = false) String amc,
            @RequestParam(required = false) String subCategory,
            @PageableDefault(size = 20) Pageable pageable) {
        return fundService.listFunds(category, risk, amc, subCategory, pageable);
    }

    @GetMapping("/mutual-funds/{schemeCode}")
    @Operation(summary = "Get full fund details: NAV, returns, portfolio holdings and ratios")
    public MutualFundDetail getFund(@PathVariable String schemeCode) {
        return fundService.getFund(schemeCode);
    }

    @GetMapping("/mutual-funds/search")
    @Operation(summary = "Search funds by name, AMC or ISIN")
    public List<MutualFundSummary> searchFunds(@RequestParam String q) {
        return fundService.searchFunds(q);
    }

    @GetMapping("/mutual-funds/top-rated")
    @Operation(summary = "Top-rated funds by category using CRISIL / Value Research ratings")
    public List<MutualFundSummary> topRated(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "10") int limit) {
        return fundService.getTopRatedFunds(category, limit);
    }

    // ─── Lump-sum Investment ──────────────────────────────────────────────────

    @PostMapping("/mutual-funds/invest")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Place a lump-sum investment in a mutual fund",
               description = "Minimum investment ₹500. Requires KYC-approved account and sufficient wallet balance.")
    public InvestmentResponse invest(
            @Valid @RequestBody InvestRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return fundService.invest(user.userId(), request);
    }

    // ─── Redemption ───────────────────────────────────────────────────────────

    @PostMapping("/mutual-funds/{schemeCode}/redeem")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Redeem units or amount from a mutual fund holding")
    public RedemptionResponse redeem(
            @PathVariable String schemeCode,
            @Valid @RequestBody RedemptionRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return fundService.redeem(user.userId(), schemeCode, request);
    }

    // ─── User Holdings ────────────────────────────────────────────────────────

    @GetMapping("/mutual-funds/holdings")
    @Operation(summary = "All mutual fund holdings with current value and XIRR")
    public List<FundHoldingResponse> getHoldings(@AuthenticationPrincipal AuthenticatedUser user) {
        return fundService.getHoldings(user.userId());
    }

    // ─── SIP Management ──────────────────────────────────────────────────────

    @PostMapping("/sip")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new SIP mandate",
               description = "Minimum SIP ₹100. Mandate created via NACH/eMandate with selected bank account.")
    public SipResponse createSip(
            @Valid @RequestBody SipRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return sipService.createSip(user.userId(), request);
    }

    @GetMapping("/sip")
    @Operation(summary = "List all active and paused SIPs")
    public List<SipResponse> listSips(@AuthenticationPrincipal AuthenticatedUser user) {
        return sipService.listSips(user.userId());
    }

    @GetMapping("/sip/{sipId}")
    @Operation(summary = "Get SIP details including instalment history")
    public SipResponse getSip(
            @PathVariable UUID sipId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return sipService.getSip(user.userId(), sipId);
    }

    @PutMapping("/sip/{sipId}")
    @Operation(summary = "Pause, resume or change SIP amount")
    public SipResponse updateSip(
            @PathVariable UUID sipId,
            @Valid @RequestBody SipRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return sipService.updateSip(user.userId(), sipId, request);
    }

    @DeleteMapping("/sip/{sipId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Cancel a SIP mandate permanently")
    public void cancelSip(
            @PathVariable UUID sipId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        sipService.cancelSip(user.userId(), sipId);
    }
}
