package com.investiq.user.dto.response;

import com.investiq.user.domain.KycStatus;
import com.investiq.user.domain.entity.KYCDocument;
import com.investiq.user.domain.entity.UserProfile;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record UserProfileResponse(
    UUID id,
    String phone,
    String email,
    String fullName,
    LocalDate dateOfBirth,
    UserProfile.Gender gender,
    String addressLine1,
    String addressLine2,
    String city,
    String state,
    String pincode,
    KycStatus kycStatus,
    List<KYCDocumentSummary> kycDocuments,
    Instant createdAt,
    Instant updatedAt
) {
    public record KYCDocumentSummary(
        UUID id,
        KYCDocument.DocumentType documentType,
        KycStatus status,
        Instant submittedAt
    ) {}

    public static UserProfileResponse from(UserProfile p) {
        List<KYCDocumentSummary> docs = p.getKycDocuments().stream()
            .map(d -> new KYCDocumentSummary(d.getId(), d.getDocumentType(), d.getStatus(), d.getCreatedAt()))
            .toList();
        return new UserProfileResponse(
            p.getId(), p.getPhone(), p.getEmail(), p.getFullName(),
            p.getDateOfBirth(), p.getGender(),
            p.getAddressLine1(), p.getAddressLine2(), p.getCity(), p.getState(), p.getPincode(),
            p.getKycStatus(), docs, p.getCreatedAt(), p.getUpdatedAt()
        );
    }
}
