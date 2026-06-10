package com.investiq.fund.security;

import com.investiq.fund.config.JwtConfig;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtConfig jwtConfig;

    public AuthenticatedUser validateToken(String token) {
        Claims claims = Jwts.parser()
            .verifyWith(signingKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();

        UUID userId = UUID.fromString(claims.getSubject());
        String role = claims.get("role", String.class);
        return new AuthenticatedUser(userId, role != null ? role : "USER");
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(jwtConfig.secret().getBytes(StandardCharsets.UTF_8));
    }
}
