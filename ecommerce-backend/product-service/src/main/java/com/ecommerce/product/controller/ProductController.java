package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.ProductCreateRequest;
import com.ecommerce.product.dto.request.ProductUpdateRequest;
import com.ecommerce.product.dto.response.ProductResponse;
import com.ecommerce.product.entity.ProductStatus;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final ProductRepository productRepository;

    @GetMapping("/admin/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        return ResponseEntity.ok(Map.of(
                "totalProducts",    productRepository.count(),
                "activeProducts",   productRepository.countByStatus(ProductStatus.ACTIVE),
                "disabledProducts", productRepository.countByStatus(ProductStatus.DISABLED),
                "newProductsToday", productRepository.countByCreatedAtAfter(LocalDate.now().minusDays(1))
        ));
    }

    /**
     * POST /api/products
     * Tạo sản phẩm mới
     */
    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(
            @Valid @RequestBody ProductCreateRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String sellerId) {

        if (sellerId == null || sellerId.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        ProductResponse response = productService.createProduct(request, sellerId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * POST /api/products/{id}/images
     * Upload danh sách hình ảnh (Lên S3)
     */
    @PostMapping("/{id}/images")
    public ResponseEntity<List<String>> uploadImages(
            @PathVariable("id") String productId,
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "replace", defaultValue = "false") boolean replace,
            @RequestHeader(value = "X-User-Id", required = false) String sellerId) {

        if (sellerId == null || sellerId.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<String> imageUrls = productService.uploadProductImages(productId, files, sellerId, replace);
        return ResponseEntity.ok(imageUrls);
    }

    /**
     * DELETE /api/products/{id}
     * Xóa Sản Phẩm (Hay đúng hơn là Chuyển thành trạng thái DISABLED ở tầng Service)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteProduct(
            @PathVariable("id") String productId,
            @RequestHeader(value = "X-User-Id", required = false) String sellerId) {

        if (sellerId == null || sellerId.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        productService.deleteProduct(productId, sellerId);
        return ResponseEntity.ok("Sản phẩm đã được ngưng bán thành công!");
    }

    /**
     * GET /api/products/{id}
     * Xem chi tiết 1 sản phẩm
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductDetail(@PathVariable("id") String productId) {
        ProductResponse response = productService.getProductById(productId);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/products
     * Tìm kiếm và Lọc sản phẩm (Phân trang)
     * URL Ví dụ: GET /api/products?keyword=iphone&categoryId=88&sellerId=seller-123&minPrice=100&page=0&size=20
     */
    @GetMapping
    public ResponseEntity<java.util.Map<String, Object>> getProducts(
            @RequestParam(value = "keyword", required = false) String keyword,
            @RequestParam(value = "categoryId", required = false) String categoryId,
            @RequestParam(value = "sellerId", required = false) String sellerId,
            @RequestParam(value = "minPrice", required = false) Double minPrice,
            @RequestParam(value = "maxPrice", required = false) Double maxPrice,
            @RequestParam(value = "rating", required = false) Integer rating,
            @RequestParam(value = "sort", required = false) String sort,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {

        Sort springSort = switch (sort != null ? sort : "") {
            case "price_asc"  -> Sort.by(Sort.Direction.ASC,  "price");
            case "price_desc" -> Sort.by(Sort.Direction.DESC, "price");
            case "newest"     -> Sort.by(Sort.Direction.DESC, "createdAt");
            default           -> Sort.unsorted();
        };
        Pageable pageable = PageRequest.of(page, size, springSort);

        org.springframework.data.domain.Page<ProductResponse> products =
                productService.filterAndSearchProducts(keyword, categoryId, sellerId, minPrice, maxPrice, rating, pageable);

        java.util.Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("content", products.getContent());
        body.put("totalElements", products.getTotalElements());
        body.put("totalPages", products.getTotalPages());
        body.put("size", products.getSize());
        body.put("number", products.getNumber());
        body.put("first", products.isFirst());
        body.put("last", products.isLast());
        body.put("empty", products.isEmpty());
        return ResponseEntity.ok(body);
    }

    /**
     * PUT /api/products/{id}
     * Cập nhật thông tin gốc Sản phẩm (Seller)
     */
    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable("id") String productId,
            @RequestBody ProductUpdateRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String sellerId) {
        if (sellerId == null || sellerId.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(productService.updateProduct(productId, request, sellerId));
    }

    /**
     * POST /api/products/{id}/variants
     * Đăng thêm màu/size cho Sản phẩm
     */
    @PostMapping("/{id}/variants")
    public ResponseEntity<String> createVariant(
            @PathVariable("id") String productId,
            @Valid @RequestBody com.ecommerce.product.dto.request.VariantRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String sellerId) {
        if (sellerId == null || sellerId.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        productService.createVariant(productId, request, sellerId);
        return new ResponseEntity<>("Thêm phân loại thành công!", HttpStatus.CREATED);
    }

    /**
     * POST /api/products/{id}/reviews
     * Góp ý nhận xét của Khách Hàng (User)
     */
    @PostMapping("/{id}/reviews")
    public ResponseEntity<String> createReview(
            @PathVariable("id") String productId,
            @Valid @RequestBody com.ecommerce.product.dto.request.ReviewRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId == null || userId.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        productService.createReview(productId, request, userId);
        return new ResponseEntity<>("Cám ơn bạn đã nhận xét!", HttpStatus.CREATED);
    }

    /**
     * GET /api/products/{id}/reviews
     * Lấy các sao đánh giá
     */
    @GetMapping("/{id}/reviews")
    public ResponseEntity<List<com.ecommerce.product.dto.response.ReviewResponse>> getProductReviews(@PathVariable("id") String productId) {
        return ResponseEntity.ok(productService.getReviewsByProductId(productId));
    }

    /**
     * POST /api/products/{id}/decrement-stock
     * Internal endpoint — chỉ gọi từ order-service để trừ tồn kho khi có đơn hàng
     */
    @PostMapping("/{id}/decrement-stock")
    public ResponseEntity<Void> decrementStock(
            @PathVariable("id") String productId,
            @RequestParam(value = "variantId", required = false) String variantId,
            @RequestParam("quantity") int quantity) {
        productService.decrementStock(productId, variantId, quantity);
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/products/check-stock
     * Internal endpoint — kiểm tra tồn kho cho danh sách sản phẩm trước khi tạo đơn
     */
    @PostMapping("/check-stock")
    public ResponseEntity<com.ecommerce.product.dto.response.StockCheckResponse> checkStock(
            @RequestBody com.ecommerce.product.dto.request.StockCheckRequest request) {
        return ResponseEntity.ok(productService.checkStock(request));
    }
    /**
     * POST /api/products/{id}/increment-stock
     * Internal endpoint — chỉ gọi từ order-service để cộng lại tồn kho khi hủy đơn hàng
     */
    @PostMapping("/{id}/increment-stock")
    public ResponseEntity<Void> incrementStock(
            @PathVariable("id") String productId,
            @RequestParam(value = "variantId", required = false) String variantId,
            @RequestParam("quantity") int quantity) {
        productService.incrementStock(productId, variantId, quantity);
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/products/admin/elasticsearch/sync
     * Admin endpoint — đồng bộ toàn bộ dữ liệu Sản phẩm đang có từ PostgreSQL lên Elasticsearch
     */
    @PostMapping("/admin/elasticsearch/sync")
    public ResponseEntity<String> syncElasticsearch() {
        productService.syncAllProductsToElasticsearch();
        return ResponseEntity.ok("Đồng bộ dữ liệu lên Elasticsearch thành công!");
    }

}
