package com.ecommerce.user_service.controller;

import com.ecommerce.user_service.entity.BanAppeal;
import com.ecommerce.user_service.entity.BanAppealStatus;
import com.ecommerce.user_service.service.BanAppealService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users/appeals")
@RequiredArgsConstructor
public class BanAppealController {

    private final BanAppealService banAppealService;
    private final com.ecommerce.user_service.service.S3Service s3Service;

    @PostMapping("/public/upload-evidence")
    public ResponseEntity<Map<String, String>> uploadEvidence(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        try {
            String url = s3Service.uploadFile(file, "appeals");
            return ResponseEntity.ok(Map.of("url", url));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/public")
    public ResponseEntity<BanAppeal> createAppeal(@RequestBody Map<String, Object> payload) {
        String email = (String) payload.get("email");
        String reason = (String) payload.get("reason");
        List<String> evidenceImages = null;
        if (payload.get("evidenceImages") instanceof List) {
            evidenceImages = (List<String>) payload.get("evidenceImages");
        }
        if (email == null || reason == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(banAppealService.createAppeal(email, reason, evidenceImages));
    }

    @GetMapping("/public/status")
    public ResponseEntity<BanAppeal> getStatus(@RequestParam("email") String email) {
        return ResponseEntity.ok(banAppealService.getStatus(email));
    }

    @GetMapping("/admin")
    public ResponseEntity<Page<BanAppeal>> listAppeals(
            @RequestHeader(value = "X-Role", defaultValue = "") String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(banAppealService.listAppeals(PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @PatchMapping("/admin/{id}/review")
    public ResponseEntity<BanAppeal> reviewAppeal(
            @RequestHeader(value = "X-Role", defaultValue = "") String role,
            @PathVariable String id,
            @RequestBody Map<String, Object> payload) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        String statusStr = (String) payload.get("status");
        String adminNote = (String) payload.get("adminNote");

        BanAppealStatus status;
        try {
            status = BanAppealStatus.valueOf(statusStr);
        } catch (IllegalArgumentException | NullPointerException e) {
            return ResponseEntity.badRequest().build();
        }

        return ResponseEntity.ok(banAppealService.reviewAppeal(id, status, adminNote));
    }

}
