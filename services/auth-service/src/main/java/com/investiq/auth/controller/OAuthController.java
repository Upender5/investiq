package com.investiq.auth.controller;

import com.investiq.auth.dto.request.OAuthLoginRequest;
import com.investiq.auth.dto.response.ApiResponse;
import com.investiq.auth.dto.response.AuthResponse;
import com.investiq.auth.service.OAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth/oauth")
@RequiredArgsConstructor
@Tag(name = "OAuth / Social Login")
public class OAuthController {

    private final OAuthService oAuthService;

    @PostMapping("/google")
    @Operation(summary = "Login or register with a Google ID token")
    public ApiResponse<AuthResponse> googleLogin(@Valid @RequestBody OAuthLoginRequest request) {
        return ApiResponse.ok(oAuthService.loginWithGoogle(request.idToken(), request.deviceToken()));
    }

    @PostMapping("/apple")
    @Operation(summary = "Login or register with an Apple identity token")
    public ApiResponse<AuthResponse> appleLogin(@Valid @RequestBody OAuthLoginRequest request) {
        return ApiResponse.ok(oAuthService.loginWithApple(request.idToken(), request.deviceToken()));
    }
}
