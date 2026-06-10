package com.investiq.auth.controller;

import com.investiq.auth.dto.request.ChangePasswordRequest;
import com.investiq.auth.dto.request.ForgotPasswordRequest;
import com.investiq.auth.dto.request.ResetPasswordRequest;
import com.investiq.auth.dto.response.ApiResponse;
import com.investiq.auth.dto.response.MessageResponse;
import com.investiq.auth.service.PasswordService;
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
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Password Management")
public class PasswordController {

    private final PasswordService passwordService;

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Request a password reset link via email/SMS")
    public ApiResponse<MessageResponse> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {
        passwordService.initiatePasswordReset(request.identifier());
        return ApiResponse.ok(MessageResponse.of(
            "If an account exists, a reset link has been sent"
        ));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Set a new password using a reset token")
    public ApiResponse<MessageResponse> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {
        passwordService.resetPassword(request.token(), request.newPassword());
        return ApiResponse.ok(MessageResponse.of("Password reset successful"));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change password for authenticated user",
               security = @SecurityRequirement(name = "bearerAuth"))
    public ApiResponse<MessageResponse> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        passwordService.changePassword(principal.getUsername(), request.currentPassword(), request.newPassword());
        return ApiResponse.ok(MessageResponse.of("Password changed successfully"));
    }
}
