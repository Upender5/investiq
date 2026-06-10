package com.investiq.auth.service;

import com.investiq.auth.domain.entity.MfaBackupCode;
import com.investiq.auth.domain.entity.User;
import com.investiq.auth.domain.repository.MfaBackupCodeRepository;
import com.investiq.auth.domain.repository.UserRepository;
import com.investiq.auth.dto.response.MfaSetupResponse;
import com.investiq.auth.exception.AuthException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MfaServiceImpl implements MfaService {

    private static final String ISSUER = "InvestIQ";
    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final int TOTP_WINDOW = 1; // ±1 period tolerance
    private static final int BACKUP_CODE_COUNT = 8;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final MfaBackupCodeRepository backupCodeRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public MfaSetupResponse initiateMfaSetup(String userId) {
        User user = findUser(userId);
        byte[] secretBytes = new byte[20];
        SECURE_RANDOM.nextBytes(secretBytes);
        String secret = base32Encode(secretBytes);

        user.setMfaSecret(secret);
        userRepository.save(user);

        String account = user.getPhone() != null ? user.getPhone() : user.getEmail();
        String qrUrl = "otpauth://totp/" + ISSUER + ":" + account
                + "?secret=" + secret
                + "&issuer=" + ISSUER
                + "&algorithm=SHA1&digits=6&period=30";

        List<String> rawCodes = generateBackupCodes(UUID.fromString(userId));

        return new MfaSetupResponse(secret, qrUrl, ISSUER, rawCodes);
    }

    @Override
    @Transactional
    public void verifyAndActivate(String userId, String code) {
        User user = findUser(userId);
        if (user.getMfaSecret() == null) {
            throw new AuthException("MFA setup not initiated");
        }
        if (!verifyTotp(user.getMfaSecret(), code)) {
            throw new AuthException("Invalid MFA code");
        }
        user.setMfaEnabled(true);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void disableMfa(String userId, String code) {
        User user = findUser(userId);
        if (!user.isMfaEnabled()) {
            throw new AuthException("MFA is not enabled");
        }
        boolean validTotp = verifyTotp(user.getMfaSecret(), code);
        boolean validBackup = !validTotp && verifyBackupCode(UUID.fromString(userId), code);
        if (!validTotp && !validBackup) {
            throw new AuthException("Invalid MFA code");
        }
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        userRepository.save(user);
        backupCodeRepository.deleteAllByUserId(UUID.fromString(userId));
    }

    @Override
    public boolean isMfaEnabled(String userId) {
        return findUser(userId).isMfaEnabled();
    }

    // ── TOTP (RFC 6238 / HOTP RFC 4226) ──────────────────────────────────────

    boolean verifyTotp(String base32Secret, String code) {
        if (code == null || code.length() != 6) return false;
        long counter = Instant.now().getEpochSecond() / 30;
        for (int i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
            if (computeHotp(base32Secret, counter + i).equals(code)) return true;
        }
        return false;
    }

    private String computeHotp(String base32Secret, long counter) {
        try {
            byte[] key = base32Decode(base32Secret);
            byte[] msg = ByteBuffer.allocate(8).putLong(counter).array();
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "HmacSHA1"));
            byte[] hash = mac.doFinal(msg);
            int offset = hash[hash.length - 1] & 0x0F;
            int code = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);
            return String.format("%06d", code % 1_000_000);
        } catch (Exception e) {
            throw new IllegalStateException("TOTP computation failed", e);
        }
    }

    // ── Backup codes ──────────────────────────────────────────────────────────

    private List<String> generateBackupCodes(UUID userId) {
        backupCodeRepository.deleteAllByUserId(userId);
        List<String> rawCodes = new ArrayList<>();
        for (int i = 0; i < BACKUP_CODE_COUNT; i++) {
            byte[] bytes = new byte[5];
            SECURE_RANDOM.nextBytes(bytes);
            String raw = String.format("%05X-%05X",
                    (long) (bytes[0] & 0xFF) << 16 | (bytes[1] & 0xFF) << 8 | (bytes[2] & 0xFF),
                    (long) (bytes[3] & 0xFF) << 8 | (bytes[4] & 0xFF));
            backupCodeRepository.save(MfaBackupCode.builder()
                    .userId(userId)
                    .codeHash(passwordEncoder.encode(raw))
                    .build());
            rawCodes.add(raw);
        }
        return rawCodes;
    }

    private boolean verifyBackupCode(UUID userId, String code) {
        return backupCodeRepository.findByUserIdAndUsedFalse(userId).stream()
                .filter(bc -> passwordEncoder.matches(code, bc.getCodeHash()))
                .findFirst()
                .map(bc -> {
                    bc.setUsed(true);
                    backupCodeRepository.save(bc);
                    return true;
                })
                .orElse(false);
    }

    // ── Base32 ────────────────────────────────────────────────────────────────

    static String base32Encode(byte[] data) {
        StringBuilder sb = new StringBuilder();
        int buffer = 0, bitsLeft = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                bitsLeft -= 5;
                sb.append(BASE32_ALPHABET.charAt((buffer >> bitsLeft) & 0x1F));
            }
        }
        if (bitsLeft > 0) {
            sb.append(BASE32_ALPHABET.charAt((buffer << (5 - bitsLeft)) & 0x1F));
        }
        return sb.toString();
    }

    static byte[] base32Decode(String encoded) {
        String upper = encoded.toUpperCase().replaceAll("[^A-Z2-7]", "");
        int outLen = upper.length() * 5 / 8;
        byte[] out = new byte[outLen];
        int buffer = 0, bitsLeft = 0, idx = 0;
        for (char c : upper.toCharArray()) {
            int val = BASE32_ALPHABET.indexOf(c);
            if (val < 0) continue;
            buffer = (buffer << 5) | val;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                bitsLeft -= 8;
                out[idx++] = (byte) ((buffer >> bitsLeft) & 0xFF);
            }
        }
        return out;
    }

    private User findUser(String userId) {
        return userRepository.findById(UUID.fromString(userId))
                .orElseThrow(() -> new AuthException("User not found"));
    }
}
