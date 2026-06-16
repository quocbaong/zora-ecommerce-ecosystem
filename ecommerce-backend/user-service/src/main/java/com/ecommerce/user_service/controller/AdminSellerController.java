package com.ecommerce.user_service.controller;

import com.ecommerce.user_service.dto.AdminReviewRequest;
import com.ecommerce.user_service.dto.SellerApplicationResponse;
import com.ecommerce.user_service.service.AdminSellerService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users/admin/seller-applications")
@RequiredArgsConstructor
public class AdminSellerController {

    private final AdminSellerService adminSellerService;

    @GetMapping
    public ResponseEntity<Page<SellerApplicationResponse>> list(
            @RequestHeader(value = "X-User-Id", required = false) String adminId,
            @RequestHeader(value = "X-Role", defaultValue = "") String role,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (!isAdmin(adminId, role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(adminSellerService.listApplications(status, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SellerApplicationResponse> getOne(
            @RequestHeader(value = "X-User-Id", required = false) String adminId,
            @RequestHeader(value = "X-Role", defaultValue = "") String role,
            @PathVariable String id) {
        if (!isAdmin(adminId, role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(adminSellerService.getApplication(id));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<SellerApplicationResponse> approve(
            @RequestHeader(value = "X-User-Id", required = false) String adminId,
            @RequestHeader(value = "X-Role", defaultValue = "") String role,
            @PathVariable String id,
            @RequestBody(required = false) AdminReviewRequest request) {
        if (!isAdmin(adminId, role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(adminSellerService.approve(id, adminId, request));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<SellerApplicationResponse> reject(
            @RequestHeader(value = "X-User-Id", required = false) String adminId,
            @RequestHeader(value = "X-Role", defaultValue = "") String role,
            @PathVariable String id,
            @RequestBody(required = false) AdminReviewRequest request) {
        if (!isAdmin(adminId, role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return ResponseEntity.ok(adminSellerService.reject(id, adminId, request));
    }

    private boolean isAdmin(String adminId, String role) {
        return adminId != null && !adminId.isBlank() && "ADMIN".equalsIgnoreCase(role);
    }
}
