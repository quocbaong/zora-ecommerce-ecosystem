package com.ecommerce.gateway_service.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtUtilTest {

    private static final String SECRET = "test-secret-key-for-unit-tests-32bytes-minimum!!";

    private final JwtUtil jwtUtil = new JwtUtil(SECRET);
    private final SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    private String token(String subject, String role) {
        return Jwts.builder()
                .subject(subject)
                .claim("role", role)
                .claim("email", "a@b.com")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(key)
                .compact();
    }

    @Test
    void validatesAndExtractsClaims() {
        String t = token("u1", "ADMIN");

        assertTrue(jwtUtil.validateToken(t));
        assertEquals("u1", jwtUtil.extractUserId(t));
        assertEquals("ADMIN", jwtUtil.extractRole(t));
        assertEquals("a@b.com", jwtUtil.extractEmail(t));
        assertFalse(jwtUtil.isTokenExpired(t));
    }

    @Test
    void rejectsMalformedToken() {
        assertFalse(jwtUtil.validateToken("garbage.token.value"));
    }

    @Test
    void rejectsTokenSignedWithDifferentKey() {
        SecretKey otherKey = Keys.hmacShaKeyFor(
                "a-completely-different-secret-key-32bytes!!".getBytes(StandardCharsets.UTF_8));
        String forged = Jwts.builder().subject("u1").signWith(otherKey).compact();

        assertFalse(jwtUtil.validateToken(forged));
    }
}
