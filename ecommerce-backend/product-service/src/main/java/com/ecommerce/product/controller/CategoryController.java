package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.CategoryRequest;
import com.ecommerce.product.dto.response.CategoryResponse;
import com.ecommerce.product.service.CategoryService;
import com.ecommerce.product.service.impl.CategoryImageUploadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/products/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final CategoryImageUploadService categoryImageUploadService;

    /**
     * POST /api/categories
     * Tạo danh mục mới
     */
    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(@Valid @RequestBody CategoryRequest request) {
        CategoryResponse response = categoryService.createCategory(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * PUT /api/categories/{id}
     * Đổi tên hoặc đổi Cha của danh mục
     */
    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> updateCategory(
            @PathVariable("id") String categoryId,
            @Valid @RequestBody CategoryRequest request) {
        CategoryResponse response = categoryService.updateCategory(categoryId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * DELETE /api/categories/{id}
     * Xóa danh mục vĩnh viễn
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteCategory(@PathVariable("id") String categoryId) {
        categoryService.deleteCategory(categoryId);
        return ResponseEntity.ok("Xóa danh mục thành công!");
    }

    /**
     * GET /api/categories
     * Máy khách Frontend gọi hàm này để vẽ cái Menu bên góc trái màn hình (Shopee)
     */
    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getAllCategories() {
        List<CategoryResponse> categories = categoryService.getAllCategories();
        return ResponseEntity.ok(categories);
    }

    /**
     * GET /api/categories/{id}
     * Lấy chi tiết 1 Danh mục
     */
    @GetMapping("/{id}")
    public ResponseEntity<CategoryResponse> getCategoryById(@PathVariable("id") String categoryId) {
        CategoryResponse response = categoryService.getCategoryById(categoryId);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /products/categories/upload-image
     * Upload ảnh đại diện danh mục lên S3 bucket ecommerce-pool
     */
    @PostMapping("/upload-image")
    public ResponseEntity<Map<String, String>> uploadCategoryImage(
            @RequestParam("file") MultipartFile file) throws IOException {
        String url = categoryImageUploadService.uploadImage(file);
        return ResponseEntity.ok(Map.of("url", url));
    }
}
