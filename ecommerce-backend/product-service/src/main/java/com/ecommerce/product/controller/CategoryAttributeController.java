package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.CategoryAttributeRequest;
import com.ecommerce.product.dto.response.CategoryAttributeResponse;
import com.ecommerce.product.service.CategoryAttributeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/products/categories/{categoryId}/attributes")
@RequiredArgsConstructor
public class CategoryAttributeController {

    private final CategoryAttributeService service;

    /**
     * GET — Seller dùng để render form thêm/sửa sản phẩm theo danh mục
     */
    @GetMapping
    public ResponseEntity<List<CategoryAttributeResponse>> list(@PathVariable String categoryId) {
        return ResponseEntity.ok(service.getByCategory(categoryId));
    }

    /**
     * POST — Admin tạo mới định nghĩa trường thông tin cho danh mục
     */
    @PostMapping
    public ResponseEntity<CategoryAttributeResponse> create(
            @PathVariable String categoryId,
            @Valid @RequestBody CategoryAttributeRequest request) {
        return new ResponseEntity<>(service.create(categoryId, request), HttpStatus.CREATED);
    }

    @PutMapping("/{attributeId}")
    public ResponseEntity<CategoryAttributeResponse> update(
            @PathVariable String categoryId,
            @PathVariable String attributeId,
            @Valid @RequestBody CategoryAttributeRequest request) {
        return ResponseEntity.ok(service.update(categoryId, attributeId, request));
    }

    @DeleteMapping("/{attributeId}")
    public ResponseEntity<Void> delete(
            @PathVariable String categoryId,
            @PathVariable String attributeId) {
        service.delete(categoryId, attributeId);
        return ResponseEntity.noContent().build();
    }
}
