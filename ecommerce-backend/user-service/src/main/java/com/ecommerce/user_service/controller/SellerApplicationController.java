package com.ecommerce.user_service.controller;

import com.ecommerce.user_service.dto.OcrResult;
import com.ecommerce.user_service.dto.SellerApplicationRequest;
import com.ecommerce.user_service.dto.SellerApplicationResponse;
import com.ecommerce.user_service.service.OcrService;
import com.ecommerce.user_service.service.S3Service;
import com.ecommerce.user_service.service.SellerApplicationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/users/seller-applications")
@RequiredArgsConstructor
public class SellerApplicationController {

    private final SellerApplicationService sellerApplicationService;
    private final S3Service s3Service;
    private final OcrService ocrService;

    @PostMapping
    public ResponseEntity<SellerApplicationResponse> submit(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @Valid @RequestBody SellerApplicationRequest request,
            HttpServletRequest httpRequest) {
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String clientIp = resolveClientIp(httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sellerApplicationService.submit(userId, request, clientIp));
    }

    @GetMapping("/my")
    public ResponseEntity<SellerApplicationResponse> getMyApplication(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(sellerApplicationService.getMyApplication(userId));
    }

    @PostMapping("/ocr-cccd")
    public ResponseEntity<OcrResult> ocrCccd(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody Map<String, String> body) {
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String imageUrl = body.get("imageUrl");
        if (imageUrl == null || imageUrl.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(ocrService.extractCccdInfo(imageUrl));
    }

    @PostMapping("/upload-kyc-image")
    public ResponseEntity<Map<String, String>> uploadKycImage(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") String type) {
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // type: front, back, selfie, business_license
        String url = s3Service.uploadFile(file, "kyc/" + type);
        return ResponseEntity.ok(Map.of("url", url));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
