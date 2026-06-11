package com.investiq.user.service;

import com.investiq.user.domain.KycStatus;
import com.investiq.user.domain.entity.KYCDocument;
import com.investiq.user.domain.entity.UserProfile;
import com.investiq.user.domain.repository.KYCDocumentRepository;
import com.investiq.user.domain.repository.UserProfileRepository;
import com.investiq.user.dto.request.KYCSubmissionRequest;
import com.investiq.user.dto.response.KYCStatusResponse;
import com.investiq.user.security.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class KYCService {

    private final UserProfileRepository userProfileRepository;
    private final KYCDocumentRepository kycDocumentRepository;
    private final UserService userService;

    @Transactional
    public KYCStatusResponse submitDocument(UUID targetId,
                                            KYCSubmissionRequest request,
                                            AuthenticatedUser requester) {
        if (!requester.owns(targetId)) {
            throw new AccessDeniedException("Cannot submit KYC for another user");
        }

        // Lazily initialise profile on first KYC submission
        String phone = requester.userId().equals(targetId)
            ? extractPhoneFromContext()   // fallback — real impl reads from JWT claim
            : null;
        UserProfile profile = userService.findOrCreate(targetId, phone);

        // Supersede any existing pending/rejected doc of the same type
        kycDocumentRepository
            .findTopByUserIdAndDocumentTypeOrderByCreatedAtDesc(targetId, request.documentType())
            .filter(d -> d.getStatus() == KycStatus.PENDING || d.getStatus() == KycStatus.REJECTED)
            .ifPresent(old -> {
                old.setStatus(KycStatus.REJECTED);
                old.setRejectionReason("Superseded by new submission");
                kycDocumentRepository.save(old);
            });

        KYCDocument doc = KYCDocument.builder()
            .user(profile)
            .documentType(request.documentType())
            .documentNumber(request.documentNumber())
            .frontUrl(request.frontUrl())
            .backUrl(request.backUrl())
            .status(KycStatus.PENDING)
            .build();
        kycDocumentRepository.save(doc);

        // Escalate overall KYC status to IN_REVIEW if still at PENDING
        if (profile.getKycStatus() == KycStatus.PENDING) {
            profile.setKycStatus(KycStatus.IN_REVIEW);
            userProfileRepository.save(profile);
        }

        return KYCStatusResponse.from(doc);
    }

    @Transactional(readOnly = true)
    public KYCStatusResponse getStatus(UUID userId) {
        return kycDocumentRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .findFirst()
                .map(KYCStatusResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No KYC submission found"));
    }

    private String extractPhoneFromContext() {
        // Phone is carried in JWT claims; inject via constructor or ThreadLocal
        // when needed. Returning null is safe — phone is nullable on auto-created profiles.
        return null;
    }
}
