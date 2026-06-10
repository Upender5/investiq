package com.investiq.auth.service;

import com.investiq.auth.domain.entity.PasswordResetToken;
import com.investiq.auth.domain.entity.User;
import com.investiq.auth.domain.repository.PasswordResetTokenRepository;
import com.investiq.auth.domain.repository.UserRepository;
import com.investiq.auth.exception.AuthException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordServiceImpl implements PasswordService {

    private static final int RESET_TOKEN_EXPIRY_MINUTES = 15;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void initiatePasswordReset(String identifier) {
        userRepository.findByPhoneOrEmail(identifier, identifier).ifPresent(user -> {
            resetTokenRepository.deleteAllByUserId(user.getId());
            byte[] raw = new byte[32];
            SECURE_RANDOM.nextBytes(raw);
            String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
            resetTokenRepository.save(PasswordResetToken.builder()
                    .userId(user.getId())
                    .tokenHash(sha256Hex(rawToken))
                    .expiresAt(Instant.now().plus(RESET_TOKEN_EXPIRY_MINUTES, ChronoUnit.MINUTES))
                    .build());
            // In production: send rawToken via SMS/email gateway
            log.info("[PASSWORD_RESET] Token issued for userId={} (deliver via OTP channel)", user.getId());
        });
        // Always return success to prevent user-enumeration attacks
    }

    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        String hash = sha256Hex(token);
        PasswordResetToken stored = resetTokenRepository.findByTokenHashAndUsedFalse(hash)
                .orElseThrow(() -> new AuthException("Invalid or expired reset token"));
        if (stored.isExpired()) {
            throw new AuthException("Reset token has expired");
        }
        User user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new AuthException("User not found"));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        stored.setUsed(true);
        resetTokenRepository.save(stored);
        log.info("[PASSWORD_RESET] Password updated for userId={}", user.getId());
    }

    @Override
    @Transactional
    public void changePassword(String userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new AuthException("User not found"));
        if (user.getPasswordHash() == null || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new AuthException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
