package com.ecommerce.auth_service.service;

import com.ecommerce.auth_service.entity.User;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    // secret >= 32 bytes (yêu cầu HS256 của Keys.hmacShaKeyFor)
    private final JwtService jwtService = new JwtService(
            "test-secret-key-for-unit-tests-32bytes-minimum!!",
            3_600_000L,
            86_400_000L);

    private User user() {
        return User.builder()
                .id("user-123")
                .email("admin@example.com")
                .role("ADMIN")
                .build();
    }

    @Test
    void accessTokenIsValidAndCarriesUserIdAndRole() {
        String token = jwtService.generateAccessToken(user());

        assertTrue(jwtService.validateToken(token));
        assertEquals("user-123", jwtService.extractUserId(token));
        assertEquals("ADMIN", jwtService.extractRole(token));
    }

    @Test
    void malformedTokenFailsValidation() {
        assertFalse(jwtService.validateToken("not.a.valid.token"));
    }

    @Test
    void refreshTokenIsValidButHasNoRoleClaim() {
        String refresh = jwtService.generateRefreshToken(user());

        assertTrue(jwtService.validateToken(refresh));
        assertNull(jwtService.extractRole(refresh));
    }
}
