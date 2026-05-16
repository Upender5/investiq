package com.investiq.user.controller;

import com.investiq.user.dto.request.KYCSubmissionRequest;
import com.investiq.user.dto.response.KYCStatusResponse;
import com.investiq.user.dto.response.UserProfileResponse;
import com.investiq.user.security.AuthenticatedUser;
import com.investiq.user.service.KYCService;
import com.investiq.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final KYCService kycService;

    /**
     * GET /api/v1/users/{id}
     * Returns the full profile for the given user.
     * Callers can only view their own profile; ADMIN role may view any.
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserProfileResponse> getUser(
        @PathVariable UUID id,
        @AuthenticationPrincipal AuthenticatedUser requester
    ) {
        return ResponseEntity.ok(userService.getProfile(id, requester));
    }

    /**
     * PUT /api/v1/users/{id}/kyc
     * Submits a KYC document for the given user.
     * Only the user themselves may submit their own KYC.
     */
    @PutMapping("/{id}/kyc")
    public ResponseEntity<KYCStatusResponse> submitKyc(
        @PathVariable UUID id,
        @Valid @RequestBody KYCSubmissionRequest request,
        @AuthenticationPrincipal AuthenticatedUser requester
    ) {
        return ResponseEntity.ok(kycService.submitDocument(id, request, requester));
    }
}
