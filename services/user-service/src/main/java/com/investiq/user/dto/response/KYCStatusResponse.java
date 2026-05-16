package com.investiq.user.dto.response;

import com.investiq.user.domain.KycStatus;
import com.investiq.user.domain.entity.KYCDocument;

import java.time.Instant;
import java.util.UUID;

public record KYCStatusResponse(
    UUID documentId,
    KYCDocument.DocumentType documentType,
    String documentNumber,
    KycStatus status,
    String rejectionReason,
    Instant submittedAt
) {
    public static KYCStatusResponse from(KYCDocument doc) {
        return new KYCStatusResponse(
            doc.getId(),
            doc.getDocumentType(),
            doc.getDocumentNumber(),
            doc.getStatus(),
            doc.getRejectionReason(),
            doc.getCreatedAt()
        );
    }
}
