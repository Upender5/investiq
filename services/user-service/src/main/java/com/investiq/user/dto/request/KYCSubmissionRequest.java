package com.investiq.user.dto.request;

import com.investiq.user.domain.entity.KYCDocument.DocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

public record KYCSubmissionRequest(

    @NotNull(message = "Document type is required")
    DocumentType documentType,

    @NotBlank(message = "Document number is required")
    @Size(max = 50, message = "Document number must not exceed 50 characters")
    String documentNumber,

    @NotBlank(message = "Front image URL is required")
    @URL(message = "Front URL must be a valid URL")
    @Size(max = 500)
    String frontUrl,

    @URL(message = "Back URL must be a valid URL")
    @Size(max = 500)
    String backUrl  // optional — some documents are single-sided
) {}
