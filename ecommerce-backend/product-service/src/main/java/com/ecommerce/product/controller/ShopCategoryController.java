package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.ShopCategoryRequest;
import com.ecommerce.product.dto.response.ShopCategoryResponse;
import com.ecommerce.product.service.ShopCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/products/shop-categories")
@RequiredArgsConstructor
public class ShopCategoryController {

    private final ShopCategoryService service;

    @GetMapping("/seller/{sellerId}")
    public ResponseEntity<List<ShopCategoryResponse>> listBySeller(@PathVariable("sellerId") String sellerId) {
        return ResponseEntity.ok(service.listBySeller(sellerId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShopCategoryResponse> get(@PathVariable("id") String id) {
        return ResponseEntity.ok(service.get(id));
    }

    @PostMapping
    public ResponseEntity<ShopCategoryResponse> create(
            @RequestHeader(value = "X-User-Id", required = false) String sellerId,
            @Valid @RequestBody ShopCategoryRequest request) {
        if (sellerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(service.create(sellerId, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ShopCategoryResponse> update(
            @RequestHeader(value = "X-User-Id", required = false) String sellerId,
            @PathVariable("id") String id,
            @Valid @RequestBody ShopCategoryRequest request) {
        if (sellerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(service.update(sellerId, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader(value = "X-User-Id", required = false) String sellerId,
            @PathVariable("id") String id) {
        if (sellerId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        service.delete(sellerId, id);
        return ResponseEntity.noContent().build();
    }
}
