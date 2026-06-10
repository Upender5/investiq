package com.investiq.user.service;

import com.investiq.user.dto.response.KYCStatusResponse;
import com.investiq.user.dto.response.UserProfileResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Map;
import java.util.UUID;

public interface AdminService {
    Map<String, Object> getDashboardMetrics();
    Page<UserProfileResponse> listUsers(String search, String status, String kycStatus, Pageable pageable);
    UserProfileResponse getUserDetail(UUID userId);
    void updateUserStatus(UUID userId, String status, String reason);
    Page<KYCStatusResponse> getKycQueue(String status, Pageable pageable);
    KYCStatusResponse approveKyc(UUID kycId, String remarks);
    KYCStatusResponse rejectKyc(UUID kycId, String reason);
    Map<String, Object> getFeatureFlags();
    Map<String, Object> updateFeatureFlag(String flagName, boolean enabled, int rolloutPercent);
    Page<Map<String, Object>> getAuditLogs(String userId, String eventType, String from, String to, Pageable pageable);
}
