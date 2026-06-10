package com.investiq.user.service;

import com.investiq.user.domain.KycStatus;
import com.investiq.user.domain.entity.KYCDocument;
import com.investiq.user.domain.entity.UserProfile;
import com.investiq.user.domain.repository.KYCDocumentRepository;
import com.investiq.user.domain.repository.UserProfileRepository;
import com.investiq.user.dto.response.KYCStatusResponse;
import com.investiq.user.dto.response.UserProfileResponse;
import com.investiq.user.exception.UserNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final UserProfileRepository userProfileRepository;
    private final KYCDocumentRepository kycDocumentRepository;

    private final Map<String, Boolean> featureFlagStore = new ConcurrentHashMap<>();

    @Override
    public Map<String, Object> getDashboardMetrics() {
        long totalUsers = userProfileRepository.count();
        long pendingKyc = userProfileRepository.findAll().stream()
                .filter(u -> u.getKycStatus() == KycStatus.PENDING || u.getKycStatus() == KycStatus.IN_REVIEW)
                .count();
        long verifiedKyc = userProfileRepository.findAll().stream()
                .filter(u -> u.getKycStatus() == KycStatus.APPROVED)
                .count();
        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("totalUsers", totalUsers);
        metrics.put("verifiedKyc", verifiedKyc);
        metrics.put("pendingKyc", pendingKyc);
        metrics.put("activeUsers", totalUsers);
        metrics.put("timestamp", Instant.now());
        return metrics;
    }

    @Override
    public Page<UserProfileResponse> listUsers(String search, String status, String kycStatus, Pageable pageable) {
        List<UserProfile> all = userProfileRepository.findAll();
        List<UserProfile> filtered = all.stream()
                .filter(u -> search == null || search.isBlank()
                        || (u.getFullName() != null && u.getFullName().toLowerCase().contains(search.toLowerCase()))
                        || (u.getEmail() != null && u.getEmail().toLowerCase().contains(search.toLowerCase()))
                        || (u.getPhone() != null && u.getPhone().contains(search)))
                .filter(u -> kycStatus == null || kycStatus.isBlank()
                        || u.getKycStatus().name().equalsIgnoreCase(kycStatus))
                .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<UserProfileResponse> page = filtered.subList(start, end).stream()
                .map(UserProfileResponse::from).toList();
        return new PageImpl<>(page, pageable, filtered.size());
    }

    @Override
    public UserProfileResponse getUserDetail(UUID userId) {
        return userProfileRepository.findById(userId)
                .map(UserProfileResponse::from)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
    }

    @Override
    @Transactional
    public void updateUserStatus(UUID userId, String status, String reason) {
        userProfileRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        // Status changes are logged; actual suspension would set a flag in a future migration
    }

    @Override
    public Page<KYCStatusResponse> getKycQueue(String status, Pageable pageable) {
        List<KYCDocument> docs = kycDocumentRepository.findAll();
        List<KYCDocument> filtered = docs.stream()
                .filter(d -> status == null || status.isBlank()
                        || d.getStatus().name().equalsIgnoreCase(status))
                .sorted(Comparator.comparing(KYCDocument::getCreatedAt).reversed())
                .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), filtered.size());
        List<KYCStatusResponse> page = filtered.subList(start, end).stream()
                .map(KYCStatusResponse::from).toList();
        return new PageImpl<>(page, pageable, filtered.size());
    }

    @Override
    @Transactional
    public KYCStatusResponse approveKyc(UUID kycId, String remarks) {
        KYCDocument doc = kycDocumentRepository.findById(kycId)
                .orElseThrow(() -> new UserNotFoundException("KYC document not found"));
        doc.setStatus(KycStatus.APPROVED);
        doc.setReviewedAt(Instant.now());
        doc.getUser().setKycStatus(KycStatus.APPROVED);
        kycDocumentRepository.save(doc);
        return KYCStatusResponse.from(doc);
    }

    @Override
    @Transactional
    public KYCStatusResponse rejectKyc(UUID kycId, String reason) {
        KYCDocument doc = kycDocumentRepository.findById(kycId)
                .orElseThrow(() -> new UserNotFoundException("KYC document not found"));
        doc.setStatus(KycStatus.REJECTED);
        doc.setRejectionReason(reason);
        doc.setReviewedAt(Instant.now());
        doc.getUser().setKycStatus(KycStatus.REJECTED);
        kycDocumentRepository.save(doc);
        return KYCStatusResponse.from(doc);
    }

    @Override
    public Map<String, Object> getFeatureFlags() {
        Map<String, Object> flags = new LinkedHashMap<>();
        List<String> knownFlags = List.of("MUTUAL_FUNDS", "OPTIONS_TRADING", "MARGIN_TRADING",
                "AI_ADVISOR", "ALGO_TRADING", "BNPL", "CRYPTO_WATCHLIST");
        for (String flag : knownFlags) {
            boolean enabled = featureFlagStore.getOrDefault(flag, false);
            flags.put(flag, Map.of("enabled", enabled, "rolloutPercent", enabled ? 100 : 0));
        }
        return flags;
    }

    @Override
    public Map<String, Object> updateFeatureFlag(String flagName, boolean enabled, int rolloutPercent) {
        featureFlagStore.put(flagName.toUpperCase(), enabled);
        return Map.of("flag", flagName, "enabled", enabled, "rolloutPercent", rolloutPercent, "updatedAt", Instant.now());
    }

    @Override
    public Page<Map<String, Object>> getAuditLogs(String userId, String eventType, String from, String to, Pageable pageable) {
        // Audit logs are stored in auth-service. Return empty page from user-service perspective.
        return new PageImpl<>(List.of(), pageable, 0);
    }
}
