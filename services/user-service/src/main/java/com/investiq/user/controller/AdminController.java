package com.investiq.user.controller;

import com.investiq.user.dto.response.ApiResponse;
import com.investiq.user.dto.response.KYCStatusResponse;
import com.investiq.user.dto.response.UserProfileResponse;
import com.investiq.user.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'COMPLIANCE', 'SUPPORT', 'SUPER_ADMIN')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin", description = "User management, KYC review, fraud monitoring and audit logs (admin-only)")
public class AdminController {

    private final AdminService adminService;

    // ─── Dashboard ────────────────────────────────────────────────────────────

    @GetMapping("/dashboard")
    @Operation(summary = "Admin dashboard: new signups, KYC queue, active users, revenue")
    public ApiResponse<Map<String, Object>> dashboard() {
        return ApiResponse.ok(adminService.getDashboardMetrics());
    }

    // ─── User Management ─────────────────────────────────────────────────────

    @GetMapping("/users")
    @Operation(summary = "List all users with search and filter",
               description = "Supports ?search=email&status=ACTIVE&kycStatus=PENDING&page=0&size=20&sort=createdAt,desc")
    public ApiResponse<Page<UserProfileResponse>> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String kycStatus,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.ok(adminService.listUsers(search, status, kycStatus, pageable));
    }

    @GetMapping("/users/{userId}")
    @Operation(summary = "Get full user details including KYC documents, devices, and activity")
    public ApiResponse<UserProfileResponse> getUserDetail(@PathVariable UUID userId) {
        return ApiResponse.ok(adminService.getUserDetail(userId));
    }

    @PutMapping("/users/{userId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Activate, suspend, or close a user account")
    public ApiResponse<Map<String, String>> updateUserStatus(
            @PathVariable UUID userId,
            @RequestParam String status,
            @RequestParam(required = false) String reason) {
        adminService.updateUserStatus(userId, status, reason);
        return ApiResponse.ok(Map.of("userId", userId.toString(), "newStatus", status));
    }

    // ─── KYC Management ──────────────────────────────────────────────────────

    @GetMapping("/kyc")
    @Operation(summary = "KYC review queue — pending and in-review submissions",
               description = "Supports ?status=PENDING&documentType=PAN&page=0&size=20")
    public ApiResponse<Page<KYCStatusResponse>> kycQueue(
            @RequestParam(required = false, defaultValue = "PENDING") String status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.ok(adminService.getKycQueue(status, pageable));
    }

    @PutMapping("/kyc/{kycId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPLIANCE', 'SUPER_ADMIN')")
    @Operation(summary = "Approve a KYC document submission")
    public ApiResponse<KYCStatusResponse> approveKyc(
            @PathVariable UUID kycId,
            @RequestParam(required = false) String remarks) {
        return ApiResponse.ok(adminService.approveKyc(kycId, remarks));
    }

    @PutMapping("/kyc/{kycId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPLIANCE', 'SUPER_ADMIN')")
    @Operation(summary = "Reject a KYC document with a reason")
    public ApiResponse<KYCStatusResponse> rejectKyc(
            @PathVariable UUID kycId,
            @RequestParam String reason) {
        return ApiResponse.ok(adminService.rejectKyc(kycId, reason));
    }

    // ─── Feature Flags ────────────────────────────────────────────────────────

    @GetMapping("/features")
    @Operation(summary = "List all feature flags with their status")
    public ApiResponse<Map<String, Object>> listFeatureFlags() {
        return ApiResponse.ok(adminService.getFeatureFlags());
    }

    @PutMapping("/features/{flagName}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Enable or disable a feature flag",
               description = "SUPER_ADMIN only. Supports gradual rollout via rolloutPercent.")
    public ApiResponse<Map<String, Object>> updateFeatureFlag(
            @PathVariable String flagName,
            @RequestParam boolean enabled,
            @RequestParam(defaultValue = "100") int rolloutPercent) {
        return ApiResponse.ok(adminService.updateFeatureFlag(flagName, enabled, rolloutPercent));
    }

    // ─── Audit Logs ──────────────────────────────────────────────────────────

    @GetMapping("/audit")
    @Operation(summary = "Audit trail: financial transactions, KYC decisions and admin actions",
               description = "Supports ?userId=&eventType=&from=&to=&page=0&size=20&sort=createdAt,desc")
    public ApiResponse<Page<Map<String, Object>>> auditLogs(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @PageableDefault(size = 20) Pageable pageable) {
        return ApiResponse.ok(adminService.getAuditLogs(userId, eventType, from, to, pageable));
    }
}
