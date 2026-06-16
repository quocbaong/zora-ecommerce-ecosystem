package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.AdCampaignCreateRequest;
import com.ecommerce.product.dto.request.AdCampaignRejectRequest;
import com.ecommerce.product.dto.response.AdCampaignResponse;
import com.ecommerce.product.service.AdCampaignService;
import com.ecommerce.product.service.ImageUploadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ads/campaigns")
@RequiredArgsConstructor
public class AdCampaignController {

    private final AdCampaignService service;
    private final ImageUploadService imageUploadService;

    @GetMapping("/active")
    public ResponseEntity<List<AdCampaignResponse>> getActive() {
        return ResponseEntity.ok(service.getActive());
    }

    @PostMapping(value = "/upload-banner", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, String>> uploadBanner(
            @RequestPart("file") MultipartFile file,
            @RequestHeader("X-User-Id") String userId) throws IOException {
        if (userId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        String url = imageUploadService.uploadImage(file);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @PostMapping
    public ResponseEntity<AdCampaignResponse> create(
            @Valid @RequestBody AdCampaignCreateRequest req,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(userId, req));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<AdCampaignResponse>> getMine(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(service.getMyCampaigns(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(
            @PathVariable("id") String id,
            @RequestHeader("X-User-Id") String userId) {
        service.cancelMy(userId, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<Page<AdCampaignResponse>> listForAdmin(
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {
        return ResponseEntity.ok(service.listForAdmin(status, PageRequest.of(page, size)));
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<AdCampaignResponse> approve(
            @PathVariable("id") String id,
            @RequestHeader("X-User-Id") String adminId) {
        return ResponseEntity.ok(service.approve(adminId, id));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<AdCampaignResponse> reject(
            @PathVariable("id") String id,
            @RequestHeader("X-User-Id") String adminId,
            @Valid @RequestBody AdCampaignRejectRequest req) {
        return ResponseEntity.ok(service.reject(adminId, id, req.getReason()));
    }

    @PatchMapping("/{id}/force-stop")
    public ResponseEntity<AdCampaignResponse> forceStop(
            @PathVariable("id") String id,
            @RequestHeader("X-User-Id") String adminId,
            @RequestBody AdCampaignRejectRequest req) {
        return ResponseEntity.ok(service.forceStop(adminId, id, req.getReason()));
    }
}
