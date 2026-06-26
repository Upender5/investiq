package com.investiq.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.investiq.auth.config.JwtConfig;
import com.investiq.auth.config.OAuthConfig;
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

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuthServiceImpl implements OAuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final JwtConfig jwtConfig;
    private final OAuthConfig oAuthConfig;

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

    @Override
    @Transactional
    public AuthResponse loginWithGithub(String code, String redirectUri, String deviceToken) {
        OAuthConfig.Provider cfg = oAuthConfig.github();
        if (cfg == null || cfg.clientId() == null || cfg.clientId().isBlank()) {
            throw new AuthException("GitHub login is not configured");
        }
        String accessToken = exchangeGithubCode(cfg, code, redirectUri);
        OAuthClaims claims = fetchGithubProfile(accessToken);
        return loginOrRegister("GITHUB", claims);
    }

    @Override
    @Transactional
    public AuthResponse loginWithFacebook(String code, String redirectUri, String deviceToken) {
        OAuthConfig.Provider cfg = oAuthConfig.facebook();
        if (cfg == null || cfg.clientId() == null || cfg.clientId().isBlank()) {
            throw new AuthException("Facebook login is not configured");
        }
        String accessToken = exchangeFacebookCode(cfg, code, redirectUri);
        OAuthClaims claims = fetchFacebookProfile(accessToken);
        return loginOrRegister("FACEBOOK", claims);
    }

    // ─── GitHub ───────────────────────────────────────────────────────────────

    private String exchangeGithubCode(OAuthConfig.Provider cfg, String code, String redirectUri) {
        String body = form(
                "client_id", cfg.clientId(),
                "client_secret", cfg.clientSecret(),
                "code", code,
                "redirect_uri", redirectUri);
        JsonNode json = postForm("https://github.com/login/oauth/access_token", body, "application/json");
        String token = json.path("access_token").asText(null);
        if (token == null || token.isBlank()) {
            throw new AuthException("GitHub did not return an access token");
        }
        return token;
    }

    private OAuthClaims fetchGithubProfile(String accessToken) {
        JsonNode user = getJson("https://api.github.com/user", accessToken, "application/vnd.github+json");
        String sub = user.path("id").asText(null);
        String name = user.path("name").asText(user.path("login").asText(null));
        String email = user.path("email").asText(null);
        if (email == null || email.isBlank()) {
            JsonNode emails = getJson("https://api.github.com/user/emails", accessToken, "application/vnd.github+json");
            if (emails.isArray()) {
                for (JsonNode e : emails) {
                    if (e.path("primary").asBoolean(false) && e.path("verified").asBoolean(false)) {
                        email = e.path("email").asText(null);
                        break;
                    }
                }
            }
        }
        if (sub == null || email == null || email.isBlank()) {
            throw new AuthException("GitHub account has no verified email — cannot sign in");
        }
        return new OAuthClaims("github:" + sub, email, (name == null || name.isBlank()) ? null : name);
    }

    // ─── Facebook ───────────────────────────────────────────────────────────────

    private String exchangeFacebookCode(OAuthConfig.Provider cfg, String code, String redirectUri) {
        String url = "https://graph.facebook.com/v19.0/oauth/access_token?" + form(
                "client_id", cfg.clientId(),
                "client_secret", cfg.clientSecret(),
                "redirect_uri", redirectUri,
                "code", code);
        JsonNode json = getJson(url, null, "application/json");
        String token = json.path("access_token").asText(null);
        if (token == null || token.isBlank()) {
            throw new AuthException("Facebook did not return an access token");
        }
        return token;
    }

    private OAuthClaims fetchFacebookProfile(String accessToken) {
        String url = "https://graph.facebook.com/me?" + form(
                "fields", "id,name,email",
                "access_token", accessToken);
        JsonNode user = getJson(url, null, "application/json");
        String sub = user.path("id").asText(null);
        String email = user.path("email").asText(null);
        String name = user.path("name").asText(null);
        if (sub == null || email == null || email.isBlank()) {
            throw new AuthException("Facebook account did not share an email — cannot sign in");
        }
        return new OAuthClaims("facebook:" + sub, email, (name == null || name.isBlank()) ? null : name);
    }

    // ─── HTTP helpers ───────────────────────────────────────────────────────────

    private static String form(String... kv) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i + 1 < kv.length; i += 2) {
            if (sb.length() > 0) sb.append('&');
            sb.append(URLEncoder.encode(kv[i], StandardCharsets.UTF_8))
              .append('=')
              .append(URLEncoder.encode(kv[i + 1], StandardCharsets.UTF_8));
        }
        return sb.toString();
    }

    private JsonNode postForm(String url, String body, String accept) {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("Accept", accept)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) {
                throw new AuthException("OAuth provider returned status " + res.statusCode());
            }
            return MAPPER.readTree(res.body());
        } catch (AuthException e) {
            throw e;
        } catch (Exception e) {
            log.warn("OAuth POST {} failed: {}", url, e.getMessage());
            throw new AuthException("Could not reach OAuth provider");
        }
    }

    private JsonNode getJson(String url, String bearerToken, String accept) {
        try {
            HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("Accept", accept)
                    .header("User-Agent", "InvestIQ-Auth")
                    .GET();
            if (bearerToken != null) b.header("Authorization", "Bearer " + bearerToken);
            HttpResponse<String> res = HTTP.send(b.build(), HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 != 2) {
                throw new AuthException("OAuth provider returned status " + res.statusCode());
            }
            return MAPPER.readTree(res.body());
        } catch (AuthException e) {
            throw e;
        } catch (Exception e) {
            log.warn("OAuth GET {} failed: {}", url, e.getMessage());
            throw new AuthException("Could not reach OAuth provider");
        }
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
