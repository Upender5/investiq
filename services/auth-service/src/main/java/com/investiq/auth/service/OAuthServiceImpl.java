package com.investiq.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.investiq.auth.config.JwtConfig;
import com.investiq.auth.domain.entity.RefreshToken;
import com.investiq.auth.domain.entity.User;
import com.investiq.auth.domain.repository.RefreshTokenRepository;
import com.investiq.auth.domain.repository.UserRepository;
import com.investiq.auth.dto.response.AuthResponse;
import com.investiq.auth.exception.AuthException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuthServiceImpl implements OAuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final JwtConfig jwtConfig;

    @Override
    @Transactional
    public AuthResponse loginWithGoogle(String idToken, String deviceToken) {
        OAuthClaims claims = decodeIdToken(idToken, "GOOGLE");
        return loginOrRegister("GOOGLE", claims);
    }

    @Override
    @Transactional
    public AuthResponse loginWithApple(String idToken, String deviceToken) {
        OAuthClaims claims = decodeIdToken(idToken, "APPLE");
        return loginOrRegister("APPLE", claims);
    }

    private AuthResponse loginOrRegister(String provider, OAuthClaims claims) {
        User user = userRepository.findByPhoneOrEmail(claims.email(), claims.email())
                .map(existing -> {
                    if (existing.getOauthProvider() == null) {
                        existing.setOauthProvider(provider);
                        existing.setOauthSubject(claims.subject());
                        userRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> userRepository.save(User.builder()
                        .email(claims.email())
                        .fullName(claims.name())
                        .oauthProvider(provider)
                        .oauthSubject(claims.subject())
                        .build()));
        return issueTokens(user);
    }

    // Decodes the JWT payload without verifying the signature.
    // Production deployments must verify against provider JWKS endpoint.
    private OAuthClaims decodeIdToken(String idToken, String provider) {
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length < 2) throw new AuthException("Invalid ID token format");
            byte[] payloadBytes = Base64.getUrlDecoder().decode(padBase64(parts[1]));
            JsonNode payload = MAPPER.readTree(payloadBytes);
            String sub = payload.path("sub").asText(null);
            String email = payload.path("email").asText(null);
            String name = payload.path("name").asText(
                    payload.path("given_name").asText("") + " " + payload.path("family_name").asText("")).trim();
            if (sub == null || email == null) {
                throw new AuthException("ID token missing required claims");
            }
            return new OAuthClaims(sub, email, name.isBlank() ? null : name);
        } catch (AuthException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Failed to decode {} ID token: {}", provider, e.getMessage());
            throw new AuthException("Invalid ID token");
        }
    }

    private String padBase64(String s) {
        int pad = s.length() % 4;
        return pad == 0 ? s : s + "=".repeat(4 - pad);
    }

    private AuthResponse issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        byte[] rawBytes = new byte[32];
        SECURE_RANDOM.nextBytes(rawBytes);
        String rawRefresh = Base64.getUrlEncoder().withoutPadding().encodeToString(rawBytes);
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(sha256Hex(rawRefresh))
                .expiresAt(Instant.now().plusMillis(jwtConfig.refreshTokenExpiryMs()))
                .build());
        return new AuthResponse(
                accessToken, rawRefresh, jwtConfig.accessTokenExpiryMs(),
                new AuthResponse.UserInfo(user.getId(), user.getPhone(), user.getEmail(),
                        user.getFullName(), user.getRole(), user.getKycStatus()));
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private record OAuthClaims(String subject, String email, String name) {}
}
