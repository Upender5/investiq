package com.investiq.auth.dto.response;

import java.util.List;

public record MfaSetupResponse(
    String secret,
    String qrCodeUrl,
    String issuer,
    List<String> backupCodes
) {}
