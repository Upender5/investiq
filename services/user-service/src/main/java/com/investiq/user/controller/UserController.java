package com.investiq.user.controller;

import com.investiq.user.dto.request.*;
import com.investiq.user.dto.response.*;
import com.investiq.user.security.AuthenticatedUser;
import com.investiq.user.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Users", description = "User profile, KYC, addresses, bank accounts, nominees and risk profile")
public class UserController {

    private final UserService userService;
    private final KYCService kycService;
    private final AddressService addressService;
    private final BankAccountService bankAccountService;
    private final NomineeService nomineeService;
    private final RiskProfileService riskProfileService;

    // ─── Profile ─────────────────────────────────────────────────────────────

    @GetMapping("/me")
    @Operation(summary = "Get the authenticated user's own profile")
    public ApiResponse<UserProfileResponse> getMyProfile(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(userService.getProfile(user.userId(), user));
    }

    @PutMapping("/me")
    @Operation(summary = "Update name, email, date of birth and occupation")
    public ApiResponse<UserProfileResponse> updateMyProfile(
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(userService.updateProfile(user.userId(), request, user));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.userId")
    @Operation(summary = "Get any user by ID (admin) or self")
    public ApiResponse<UserProfileResponse> getUser(
            @PathVariable UUID id,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(userService.getProfile(id, user));
    }

    // ─── KYC ─────────────────────────────────────────────────────────────────

    @PutMapping("/{id}/kyc")
    @Operation(summary = "Submit a KYC document for review")
    public ApiResponse<KYCStatusResponse> submitKyc(
            @PathVariable UUID id,
            @Valid @RequestBody KYCSubmissionRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(kycService.submitDocument(id, request, user));
    }

    @GetMapping("/me/kyc")
    @Operation(summary = "Get current KYC status and submitted documents")
    public ApiResponse<KYCStatusResponse> getKycStatus(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(kycService.getStatus(user.userId()));
    }

    // ─── Addresses ───────────────────────────────────────────────────────────

    @GetMapping("/me/addresses")
    @Operation(summary = "List all saved addresses")
    public ApiResponse<List<AddressResponse>> listAddresses(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(addressService.listAddresses(user.userId()));
    }

    @PostMapping("/me/addresses")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a new address")
    public ApiResponse<AddressResponse> addAddress(
            @Valid @RequestBody AddressRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(addressService.addAddress(user.userId(), request));
    }

    @PutMapping("/me/addresses/{addressId}")
    @Operation(summary = "Update an existing address")
    public ApiResponse<AddressResponse> updateAddress(
            @PathVariable UUID addressId,
            @Valid @RequestBody AddressRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(addressService.updateAddress(user.userId(), addressId, request));
    }

    @DeleteMapping("/me/addresses/{addressId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete an address")
    public void deleteAddress(
            @PathVariable UUID addressId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        addressService.deleteAddress(user.userId(), addressId);
    }

    // ─── Bank Accounts ────────────────────────────────────────────────────────

    @GetMapping("/me/bank-accounts")
    @Operation(summary = "List verified bank accounts (account numbers masked)")
    public ApiResponse<List<BankAccountResponse>> listBankAccounts(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(bankAccountService.listBankAccounts(user.userId()));
    }

    @PostMapping("/me/bank-accounts")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add and initiate penny-drop verification of a bank account")
    public ApiResponse<BankAccountResponse> addBankAccount(
            @Valid @RequestBody BankAccountRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(bankAccountService.addBankAccount(user.userId(), request));
    }

    @DeleteMapping("/me/bank-accounts/{accountId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove a saved bank account")
    public void deleteBankAccount(
            @PathVariable UUID accountId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        bankAccountService.deleteBankAccount(user.userId(), accountId);
    }

    // ─── Nominees ────────────────────────────────────────────────────────────

    @GetMapping("/me/nominees")
    @Operation(summary = "List all registered nominees")
    public ApiResponse<List<NomineeResponse>> listNominees(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(nomineeService.listNominees(user.userId()));
    }

    @PostMapping("/me/nominees")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add a nominee (total share % must not exceed 100)")
    public ApiResponse<NomineeResponse> addNominee(
            @Valid @RequestBody NomineeRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(nomineeService.addNominee(user.userId(), request));
    }

    @DeleteMapping("/me/nominees/{nomineeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove a nominee")
    public void deleteNominee(
            @PathVariable UUID nomineeId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        nomineeService.deleteNominee(user.userId(), nomineeId);
    }

    // ─── Risk Profile ─────────────────────────────────────────────────────────

    @GetMapping("/me/risk-profile")
    @Operation(summary = "Get current risk assessment and asset allocation suggestion")
    public ApiResponse<RiskProfileResponse> getRiskProfile(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(riskProfileService.getProfile(user.userId()));
    }

    @PostMapping("/me/risk-profile")
    @Operation(summary = "Submit risk assessment questionnaire answers")
    public ApiResponse<RiskProfileResponse> submitRiskProfile(
            @Valid @RequestBody RiskProfileRequest request,
            @AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(riskProfileService.assess(user.userId(), request));
    }
}
