package com.investiq.marketdata.security;

import com.investiq.marketdata.config.JwtConfig;
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
            .verifyWith(signingKey()).build()
            .parseSignedClaims(token).getPayload();
        return new AuthenticatedUser(UUID.fromString(claims.getSubject()),
            claims.get("role", String.class));
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(jwtConfig.secret().getBytes(StandardCharsets.UTF_8));
    }
}
