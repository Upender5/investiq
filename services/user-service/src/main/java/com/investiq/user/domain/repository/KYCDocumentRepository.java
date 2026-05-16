package com.investiq.user.domain.repository;

import com.investiq.user.domain.entity.KYCDocument;
import com.investiq.user.domain.entity.KYCDocument.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface KYCDocumentRepository extends JpaRepository<KYCDocument, UUID> {

    List<KYCDocument> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<KYCDocument> findTopByUserIdAndDocumentTypeOrderByCreatedAtDesc(
        UUID userId, DocumentType documentType);
}
