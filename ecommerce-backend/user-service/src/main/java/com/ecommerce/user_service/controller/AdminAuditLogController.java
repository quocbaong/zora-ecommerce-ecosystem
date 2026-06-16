package com.ecommerce.user_service.controller;

import com.ecommerce.user_service.entity.AuditLog;
import com.ecommerce.user_service.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users/admin/audit-logs")
@RequiredArgsConstructor
public class AdminAuditLogController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public ResponseEntity<Page<AuditLog>> listAuditLogs(
            @RequestHeader(value = "X-Role", defaultValue = "") String role,
            @RequestHeader(value = "X-User-Id", required = false) String adminId,
            @RequestParam(required = false) String targetType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        if (adminId == null || adminId.isBlank() || !"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<AuditLog> result = auditLogRepository.findAll(pageable);
        return ResponseEntity.ok(result);
    }
}
