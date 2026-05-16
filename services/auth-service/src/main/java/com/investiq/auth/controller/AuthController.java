package com.investiq.auth.controller;

import com.investiq.auth.dto.request.RefreshTokenRequest;
import com.investiq.auth.dto.request.SendOtpRequest;
import com.investiq.auth.dto.request.VerifyOtpRequest;
import com.investiq.auth.dto.response.AuthResponse;
import com.investiq.auth.dto.response.OtpSentResponse;
import com.investiq.auth.service.AuthService;
import com.investiq.auth.service.OtpService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OtpService otpService;

    @PostMapping("/otp/send")
    public ResponseEntity<OtpSentResponse> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        authService.sendOtp(request.phone());
        return ResponseEntity.ok(new OtpSentResponse(
            "OTP sent to " + maskPhone(request.phone()),
            otpService.getExpirySeconds()
        ));
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<AuthResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        return ResponseEntity.ok(authService.verifyOtpAndAuthenticate(request.phone(), request.otp()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshTokenRequest request,
                                       @AuthenticationPrincipal UserDetails principal) {
        authService.logout(request.refreshToken());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal UserDetails principal) {
        return ResponseEntity.ok(Map.of(
            "userId", principal.getUsername(),
            "roles", principal.getAuthorities().stream().map(a -> a.getAuthority()).toList()
        ));
    }

    private String maskPhone(String phone) {
        return "XXXXXX" + phone.substring(6);
    }
}
