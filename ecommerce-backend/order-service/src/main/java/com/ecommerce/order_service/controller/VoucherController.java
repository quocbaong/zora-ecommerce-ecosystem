package com.ecommerce.order_service.controller;

import com.ecommerce.order_service.dto.request.VoucherRequest;
import com.ecommerce.order_service.dto.response.VoucherResponse;
import com.ecommerce.order_service.service.VoucherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/orders/vouchers")
@RequiredArgsConstructor
public class VoucherController {

    private final VoucherService voucherService;

    @GetMapping("/shop/{sellerId}")
    public ResponseEntity<List<VoucherResponse>> listShopVouchers(
            @PathVariable("sellerId") String sellerId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return ResponseEntity.ok(voucherService.listShopActiveVouchers(sellerId, userId));
    }

    @GetMapping("/active")
    public ResponseEntity<List<VoucherResponse>> listAllActiveVouchers(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return ResponseEntity.ok(voucherService.listAllActiveVouchers(userId));
    }

    @GetMapping("/seller")
    public ResponseEntity<List<VoucherResponse>> listSellerVouchers(
            @RequestHeader(value = "X-User-Id", required = false) String sellerId) {
        if (sellerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(voucherService.listSellerVouchers(sellerId));
    }

    @GetMapping("/my-saved")
    public ResponseEntity<List<VoucherResponse>> listMySavedVouchers(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(voucherService.listMySavedVouchers(userId));
    }

    @PostMapping
    public ResponseEntity<VoucherResponse> create(
            @RequestHeader(value = "X-User-Id", required = false) String sellerId,
            @Valid @RequestBody VoucherRequest request) {
        if (sellerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(voucherService.create(sellerId, request));
    }

    // Tạo voucher private gửi qua chat. targetUserId nằm trong body.
    @PostMapping("/private")
    public ResponseEntity<VoucherResponse> createPrivate(
            @RequestHeader(value = "X-User-Id", required = false) String sellerId,
            @Valid @RequestBody VoucherRequest request) {
        if (sellerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(voucherService.createPrivate(sellerId, request.getTargetUserId(), request));
    }

    // Get detail dùng cho card trong chat (hiện trạng thái saved/expired/usedUp)
    @GetMapping("/{id}")
    public ResponseEntity<VoucherResponse> getById(
            @PathVariable("id") String id,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return ResponseEntity.ok(voucherService.getById(id, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<VoucherResponse> update(
            @RequestHeader(value = "X-User-Id", required = false) String sellerId,
            @PathVariable("id") String id,
            @Valid @RequestBody VoucherRequest request) {
        if (sellerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(voucherService.update(sellerId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader(value = "X-User-Id", required = false) String sellerId,
            @PathVariable("id") String id) {
        if (sellerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        voucherService.delete(sellerId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/save")
    public ResponseEntity<Void> save(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @PathVariable("id") String id) {
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        voucherService.save(userId, id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/save")
    public ResponseEntity<Void> unsave(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @PathVariable("id") String id) {
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        voucherService.unsave(userId, id);
        return ResponseEntity.noContent().build();
    }
}
