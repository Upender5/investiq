package com.investiq.auth.service;

import com.investiq.auth.config.JwtConfig;
import com.investiq.auth.domain.entity.RefreshToken;
import com.investiq.auth.domain.entity.User;
import com.investiq.auth.domain.repository.RefreshTokenRepository;
import com.investiq.auth.domain.repository.UserRepository;
import com.investiq.auth.dto.request.LoginRequest;
import com.investiq.auth.dto.request.RegisterRequest;
import com.investiq.auth.dto.response.AuthResponse;
import com.investiq.auth.exception.AuthException;
import org.springframework.security.crypto.password.PasswordEncoder;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final OtpService otpService;
    private final JwtConfig jwtConfig;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByPhone(request.phone())) {
            throw new AuthException("Phone number already registered");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new AuthException("Email already registered");
        }
        User user = userRepository.save(User.builder()
            .fullName(request.fullName())
            .phone(request.phone())
            .email(request.email())
            .passwordHash(passwordEncoder.encode(request.password()))
            .build());
        return issueTokens(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByPhoneOrEmail(request.identifier(), request.identifier())
            .orElseThrow(() -> new AuthException("Invalid credentials"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new AuthException("Invalid credentials");
        }
        return issueTokens(user);
    }

    @Transactional
    public void logoutAll(String userId) {
        refreshTokenRepository.revokeAllByUserId(java.util.UUID.fromString(userId));
    }

    public void sendOtp(String phone) {
        otpService.generateAndStore(phone);
    }

    @Transactional
    public AuthResponse verifyOtpAndAuthenticate(String phone, String otp) {
        if (!otpService.verify(phone, otp)) {
            throw new AuthException("Invalid or expired OTP");
        }
        User user = userRepository.findByPhone(phone)
            .orElseGet(() -> userRepository.save(User.builder().phone(phone).build()));
        return issueTokens(user);
    }

    @Transactional
    public AuthResponse refresh(String rawRefreshToken) {
        String hash = sha256Hex(rawRefreshToken);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash)
            .orElseThrow(() -> new AuthException("Refresh token not found"));

        if (stored.isRevoked() || stored.isExpired()) {
            // Revoke all tokens on reuse — likely stolen token
            refreshTokenRepository.revokeAllByUserId(stored.getUser().getId());
            throw new AuthException("Refresh token is invalid or expired");
        }

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);
        return issueTokens(stored.getUser());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        String hash = sha256Hex(rawRefreshToken);
        refreshTokenRepository.findByTokenHash(hash).ifPresent(t -> {
            t.setRevoked(true);
            refreshTokenRepository.save(t);
        });
    }

    private AuthResponse issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String rawRefresh = generateRawRefreshToken();

        refreshTokenRepository.save(RefreshToken.builder()
            .user(user)
            .tokenHash(sha256Hex(rawRefresh))
            .expiresAt(Instant.now().plusMillis(jwtConfig.refreshTokenExpiryMs()))
            .build());

        return new AuthResponse(
            accessToken,
            rawRefresh,
            jwtConfig.accessTokenExpiryMs(),
            new AuthResponse.UserInfo(
                user.getId(), user.getPhone(), user.getEmail(),
                user.getFullName(), user.getRole(), user.getKycStatus()
            )
        );
    }

    private String generateRawRefreshToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
