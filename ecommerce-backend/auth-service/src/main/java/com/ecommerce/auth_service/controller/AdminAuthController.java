package com.ecommerce.auth_service.controller;

import com.ecommerce.auth_service.entity.User;
import com.ecommerce.auth_service.repository.RefreshTokenRepository;
import com.ecommerce.auth_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/auth/internal")
@RequiredArgsConstructor
@Slf4j
public class AdminAuthController {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final StringRedisTemplate redisTemplate;

    @PutMapping("/users/{userId}/role")
    public ResponseEntity<Void> updateRole(
            @PathVariable String userId,
            @RequestBody Map<String, String> body) {
        String newRole = body.get("role");
        if (newRole == null || newRole.isBlank()) return ResponseEntity.badRequest().build();
        if (!List.of("USER", "SELLER", "ADMIN").contains(newRole.toUpperCase()))
            return ResponseEntity.badRequest().build();
        return userRepository.findById(userId).map(user -> {
            user.setRole(newRole.toUpperCase());
            userRepository.save(user);
            log.info("[ADMIN_AUTH] userId={} role changed to {}", userId, newRole);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/users/{userId}/ban")
    @Transactional
    public ResponseEntity<Void> banUser(
            @PathVariable String userId,
            @RequestParam(required = false) Integer durationDays) {
        return userRepository.findById(userId).map(user -> {
            user.setStatus("BANNED");
            if (durationDays != null) {
                user.setBannedUntil(LocalDateTime.now().plusDays(durationDays));
            } else {
                user.setBannedUntil(null);
            }
            userRepository.save(user);
            // Revoke all refresh tokens
            refreshTokenRepository.deleteByUser(user);
            // Mark in Redis for gateway to block existing access tokens immediately
            redisTemplate.opsForValue().set("banned:" + userId, "1");
            log.info("[ADMIN_AUTH] userId={} BANNED (durationDays={}), tokens revoked", userId, durationDays);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/users/{userId}/unban")
    public ResponseEntity<Void> unbanUser(@PathVariable String userId) {
        return userRepository.findById(userId).map(user -> {
            user.setStatus("ACTIVE");
            user.setBannedUntil(null);
            userRepository.save(user);
            redisTemplate.delete("banned:" + userId);
            log.info("[ADMIN_AUTH] userId={} UNBANNED", userId);
            return ResponseEntity.ok().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
