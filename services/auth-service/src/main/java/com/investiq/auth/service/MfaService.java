package com.investiq.auth.service;

import com.investiq.auth.dto.response.MfaSetupResponse;

/**
 * TOTP-based multi-factor authentication using RFC 6238.
 * Backup codes are generated on setup and stored as bcrypt hashes.
 */
public interface MfaService {
    MfaSetupResponse initiateMfaSetup(String userId);
    void verifyAndActivate(String userId, String code);
    void disableMfa(String userId, String code);
    boolean isMfaEnabled(String userId);
}
