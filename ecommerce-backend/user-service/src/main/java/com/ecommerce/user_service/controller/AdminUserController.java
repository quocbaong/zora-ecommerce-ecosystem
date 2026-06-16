package com.ecommerce.user_service.controller;

import com.ecommerce.user_service.dto.AdminUserResponse;
import com.ecommerce.user_service.dto.AdminUserStatusRequest;
import com.ecommerce.user_service.entity.AuditLog;
import com.ecommerce.user_service.entity.User;
import com.ecommerce.user_service.exception.ResourceNotFoundException;
import com.ecommerce.user_service.kafka.event.UserBannedEvent;
import com.ecommerce.user_service.repository.AuditLogRepository;
import com.ecommerce.user_service.repository.SellerApplicationRepository;
import com.ecommerce.user_service.repository.UserRepository;
import com.ecommerce.user_service.service.SellerEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users/admin/users")
@RequiredArgsConstructor
@Slf4j
public class AdminUserController {

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final SellerApplicationRepository sellerApplicationRepository;
    private final com.ecommerce.user_service.repository.UserWarningRepository userWarningRepository;
    private final RestTemplate restTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final SellerEmailService sellerEmailService;

    @Value("${services.auth-url}")
    private String authServiceUrl;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(
            @RequestHeader(value = "X-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-User-Id", required = false) String adminId) {
        if (!isAdmin(adminId, role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        return ResponseEntity.ok(Map.of(
                "totalUsers", userRepository.count(),
                "totalSellers", userRepository.countByRole("SELLER"),
                "totalAdmins", userRepository.countByRole("ADMIN"),
                "newUsersToday", userRepository.countByCreatedAtAfter(startOfToday),
                "pendingApplications", sellerApplicationRepository.countByStatus("PENDING")
        ));
    }

    @GetMapping
    public ResponseEntity<Page<AdminUserResponse>> listUsers(
            @RequestHeader(value = "X-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-User-Id", required = false) String adminId,
            @RequestParam(required = false) String filterRole,
            @RequestParam(required = false) String filterStatus,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (!isAdmin(adminId, role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        PageRequest pageable = PageRequest.of(page, size, Sort.by("id").descending());
        String searchPattern = (search == null || search.isBlank()) ? null : "%" + search.toLowerCase() + "%";
        Page<AdminUserResponse> result = userRepository
                .findByFilters(filterRole, filterStatus, searchPattern, pageable)
                .map(this::toAdminResponse);
        return ResponseEntity.ok(result);
    }

    @PatchMapping("/{userId}/role")
    public ResponseEntity<AdminUserResponse> changeRole(
            @RequestHeader(value = "X-Role", defaultValue = "") String xRole,
            @RequestHeader(value = "X-User-Id", required = false) String adminId,
            @PathVariable String userId,
            @RequestParam("role") String newRole) {
        if (!isAdmin(adminId, xRole)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        if (newRole == null || !List.of("USER", "SELLER", "ADMIN").contains(newRole.toUpperCase())) {
            return ResponseEntity.badRequest().build();
        }

        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        String oldRole = user.getRole();

        // Update auth-service
        updateAuthServiceRole(userId, newRole.toUpperCase());

        // Update user-service profile
        user.setRole(newRole.toUpperCase());
        userRepository.save(user);

        auditLogRepository.save(AuditLog.builder()
                .adminId(adminId)
                .action("CHANGE_ROLE")
                .targetType("USER")
                .targetId(userId)
                .oldValue("{\"role\":\"" + oldRole + "\"}")
                .newValue("{\"role\":\"" + newRole.toUpperCase() + "\"}")
                .build());

        if ("SELLER".equals(newRole.toUpperCase()) && !"SELLER".equals(oldRole)) {
            sellerEmailService.sendRoleChangedToSellerEmail(user.getEmail(), user.getName());
        }

        log.info("[ADMIN] Changed role userId={} {} -> {} by adminId={}", userId, oldRole, newRole, adminId);
        return ResponseEntity.ok(toAdminResponse(user));
    }

    @PatchMapping("/{userId}/status")
    public ResponseEntity<AdminUserResponse> changeStatus(
            @RequestHeader(value = "X-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-User-Id", required = false) String adminId,
            @PathVariable String userId,
            @RequestBody AdminUserStatusRequest request) {
        if (!isAdmin(adminId, role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        if (request.getStatus() == null || !List.of("ACTIVE", "BANNED").contains(request.getStatus().toUpperCase())) {
            return ResponseEntity.badRequest().build();
        }

        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        String oldStatus = user.getStatus();

        String newStatus = request.getStatus().toUpperCase();
        user.setStatus(newStatus);
        user.setStatusReason(request.getReason());
        userRepository.save(user);

        // Sync ban/unban to auth-service (blocks login + revokes tokens + sets Redis key for gateway)
        if ("BANNED".equals(newStatus)) {
            updateAuthServiceStatus(userId, "ban");
        } else {
            updateAuthServiceStatus(userId, "unban");
        }

        auditLogRepository.save(AuditLog.builder()
                .adminId(adminId)
                .action("BANNED".equals(newStatus) ? "BAN_USER" : "UNBAN_USER")
                .targetType("USER")
                .targetId(userId)
                .oldValue("{\"status\":\"" + oldStatus + "\"}")
                .newValue("{\"status\":\"" + newStatus + "\"}")
                .reason(request.getReason())
                .build());

        // Publish Kafka event so notification-service sends in-app + email
        if ("BANNED".equals(newStatus)) {
            kafkaTemplate.send("user_banned", UserBannedEvent.builder()
                    .userId(userId)
                    .email(user.getEmail())
                    .name(user.getName())
                    .reason(request.getReason())
                    .build());
        } else if ("ACTIVE".equals(newStatus) && "BANNED".equals(oldStatus)) {
            kafkaTemplate.send("user_unbanned", com.ecommerce.user_service.kafka.event.UserUnbannedEvent.builder()
                    .userId(userId)
                    .reason(request.getReason())
                    .build());
        }

        log.info("[ADMIN] Changed status userId={} {} -> {} by adminId={}", userId, oldStatus, newStatus, adminId);
        return ResponseEntity.ok(toAdminResponse(user));
    }

    @PostMapping("/{userId}/warning")
    public ResponseEntity<?> issueWarning(
            @RequestHeader(value = "X-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-User-Id", required = false) String adminId,
            @PathVariable String userId,
            @RequestBody Map<String, String> payload) {
        if (!isAdmin(adminId, role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        User user = userRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        
        int currentWarningCount = user.getWarningCount() != null ? user.getWarningCount() : 0;
        user.setWarningCount(currentWarningCount + 1);
        userRepository.save(user);

        com.ecommerce.user_service.entity.UserWarning warning = com.ecommerce.user_service.entity.UserWarning.builder()
                .userId(userId)
                .warningNumber(user.getWarningCount())
                .reason(payload.get("reason"))
                .status("PENDING_APPEAL")
                .expiresAt(LocalDateTime.now().plusDays(3))
                .build();
        userWarningRepository.save(warning);

        kafkaTemplate.send("user_warned", com.ecommerce.user_service.kafka.event.UserWarnedEvent.builder()
                .userId(userId)
                .email(user.getEmail())
                .name(user.getName())
                .warningNumber(user.getWarningCount())
                .reason(payload.get("reason"))
                .build());

        return ResponseEntity.ok(warning);
    }

    private void updateAuthServiceRole(String userId, String newRole) {
        try {
            restTemplate.put(
                    authServiceUrl + "/auth/internal/users/" + userId + "/role",
                    Map.of("role", newRole));
        } catch (Exception e) {
            log.error("[ADMIN] Failed to update auth-service role for userId={}: {}", userId, e.getMessage());
            throw new RuntimeException("Failed to update role in auth-service");
        }
    }

    private void updateAuthServiceStatus(String userId, String action) {
        try {
            restTemplate.put(authServiceUrl + "/auth/internal/users/" + userId + "/" + action, null);
        } catch (Exception e) {
            log.error("[ADMIN] Failed to {} user userId={} in auth-service: {}", action, userId, e.getMessage());
        }
    }

    private boolean isAdmin(String adminId, String role) {
        return adminId != null && !adminId.isBlank() && "ADMIN".equalsIgnoreCase(role);
    }

    private AdminUserResponse toAdminResponse(User user) {
        Boolean emailVerified = fetchEmailVerified(user.getUserId());
        return AdminUserResponse.builder()
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole() != null ? user.getRole() : "USER")
                .status(user.getStatus() != null ? user.getStatus() : "ACTIVE")
                .statusReason(user.getStatusReason())
                .createdAt(user.getCreatedAt())
                .emailVerified(emailVerified)
                .build();
    }

    /** Best-effort lookup of email verification status from auth-service. */
    @SuppressWarnings("unchecked")
    private Boolean fetchEmailVerified(String userId) {
        if (userId == null || userId.isBlank()) return null;
        try {
            String url = authServiceUrl + "/auth/internal/user-by-id/" + userId;
            Map<String, Object> body = restTemplate.getForObject(url, Map.class);
            if (body == null) return null;
            Object v = body.get("emailVerified");
            return v instanceof Boolean ? (Boolean) v : null;
        } catch (Exception e) {
            return null; // non-fatal: just don't set the flag
        }
    }
}
