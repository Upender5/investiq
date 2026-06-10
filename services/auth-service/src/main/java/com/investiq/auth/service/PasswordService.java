package com.investiq.auth.service;

/**
 * Handles password reset and change flows.
 * Implementations must use time-limited, single-use tokens stored in Redis.
 */
public interface PasswordService {
    void initiatePasswordReset(String identifier);
    void resetPassword(String token, String newPassword);
    void changePassword(String userId, String currentPassword, String newPassword);
}
