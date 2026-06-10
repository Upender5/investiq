package com.investiq.auth.controller;

import com.investiq.auth.dto.request.*;
import com.investiq.auth.dto.response.*;
import com.investiq.auth.service.AuthService;
import com.investiq.auth.service.OtpService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Registration, login, OTP, and token management")
public class AuthController {

    private final AuthService authService;
    private final OtpService otpService;

    // ─── Registration ────────────────────────────────────────────────────────

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new user account")
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok(authService.register(request));
    }

    // ─── Password-based Login ────────────────────────────────────────────────

    @PostMapping("/login")
    @Operation(summary = "Login with phone/email and password")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    // ─── OTP Flow ────────────────────────────────────────────────────────────

    @PostMapping("/otp/send")
    @Operation(summary = "Send OTP to a phone number")
    public ApiResponse<OtpSentResponse> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        authService.sendOtp(request.phone());
        return ApiResponse.ok(new OtpSentResponse(
            "OTP sent to " + maskPhone(request.phone()),
            otpService.getExpirySeconds()
        ));
    }

    @PostMapping("/otp/verify")
    @Operation(summary = "Verify OTP and receive tokens")
    public ApiResponse<AuthResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        return ApiResponse.ok(authService.verifyOtpAndAuthenticate(request.phone(), request.otp()));
    }

    // ─── Token Management ────────────────────────────────────────────────────

    @PostMapping("/refresh")
    @Operation(summary = "Rotate access token using a valid refresh token")
    public ApiResponse<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.ok(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoke a refresh token (logout from one device)")
    public void logout(@Valid @RequestBody RefreshTokenRequest request,
                       @AuthenticationPrincipal UserDetails principal) {
        authService.logout(request.refreshToken());
    }

    @PostMapping("/logout-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoke all refresh tokens (logout from all devices)")
    public void logoutAll(@AuthenticationPrincipal UserDetails principal) {
        authService.logoutAll(principal.getUsername());
    }

    // ─── Current User ────────────────────────────────────────────────────────

    @GetMapping("/me")
    @Operation(summary = "Get the currently authenticated user's info")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(Map.of(
            "userId", principal.getUsername(),
            "roles",  principal.getAuthorities().stream().map(a -> a.getAuthority()).toList()
        ));
    }

    // ─── Private ─────────────────────────────────────────────────────────────

    private String maskPhone(String phone) {
        return "XXXXXX" + phone.substring(6);
    }
}
