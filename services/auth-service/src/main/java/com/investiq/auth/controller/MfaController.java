package com.investiq.auth.controller;

import com.investiq.auth.dto.request.MfaVerifyRequest;
import com.investiq.auth.dto.response.ApiResponse;
import com.investiq.auth.dto.response.MessageResponse;
import com.investiq.auth.dto.response.MfaSetupResponse;
import com.investiq.auth.service.MfaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/mfa")
@RequiredArgsConstructor
@Tag(name = "Multi-Factor Authentication")
@SecurityRequirement(name = "bearerAuth")
public class MfaController {

    private final MfaService mfaService;

    @PostMapping("/enable")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Begin MFA setup — returns TOTP secret and QR code URL")
    public ApiResponse<MfaSetupResponse> enableMfa(
            @AuthenticationPrincipal UserDetails principal) {
        return ApiResponse.ok(mfaService.initiateMfaSetup(principal.getUsername()));
    }

    @PostMapping("/verify")
    @Operation(summary = "Confirm MFA code to activate TOTP (or verify during login)")
    public ApiResponse<MessageResponse> verifyMfa(
            @Valid @RequestBody MfaVerifyRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        mfaService.verifyAndActivate(principal.getUsername(), request.code());
        return ApiResponse.ok(MessageResponse.of("MFA enabled successfully"));
    }

    @PostMapping("/disable")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Disable MFA — requires a valid TOTP or backup code")
    public void disableMfa(
            @Valid @RequestBody MfaVerifyRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        mfaService.disableMfa(principal.getUsername(), request.code());
    }
}
