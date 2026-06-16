package com.ecommerce.product.controller;

import com.ecommerce.product.dto.response.ProductResponse;
import com.ecommerce.product.entity.CommissionRate;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.entity.ProductStatus;
import com.ecommerce.product.repository.CategoryRepository;
import com.ecommerce.product.repository.CommissionRateRepository;
import com.ecommerce.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/products/admin")
@RequiredArgsConstructor
public class AdminProductController {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final CommissionRateRepository commissionRateRepository;

    // Danh sách toàn bộ sản phẩm (mọi status), hỗ trợ filter
    @GetMapping("/products")
    @Transactional(readOnly = true)
    public Page<ProductResponse> listAll(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String sellerId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        ProductStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            statusEnum = ProductStatus.valueOf(status);
        }

        Page<Product> products = productRepository.adminSearchProducts(
                keyword, categoryId, sellerId, statusEnum,
                PageRequest.of(page, size, Sort.by("createdAt").descending())
        );
        return products.map(this::mapToResponse);
    }

    // Chặn hoặc bỏ chặn sản phẩm
    @PatchMapping("/products/{id}/status")
    public ResponseEntity<Map<String, String>> updateStatus(
            @PathVariable String id,
            @RequestParam String status) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sản phẩm không tồn tại: " + id));
        product.setStatus(ProductStatus.valueOf(status));
        productRepository.save(product);
        return ResponseEntity.ok(Map.of("message", "Cập nhật trạng thái thành công"));
    }

    // Xóa vĩnh viễn sản phẩm
    @DeleteMapping("/products/{id}/hard")
    public ResponseEntity<Map<String, String>> hardDelete(@PathVariable String id) {
        if (!productRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        productRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Đã xóa vĩnh viễn sản phẩm"));
    }

    // Lấy chi tiết sản phẩm (dùng endpoint hiện có GET /products/{id}, endpoint này dự phòng)
    @GetMapping("/products/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<ProductResponse> getDetail(@PathVariable String id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sản phẩm không tồn tại: " + id));
        return ResponseEntity.ok(mapToResponse(product));
    }

    // Lấy danh sách tỉ lệ hoa hồng theo danh mục
    @GetMapping("/commission-rates")
    public List<Map<String, Object>> getCommissionRates() {
        List<CommissionRate> rates = commissionRateRepository.findAll();
        return rates.stream().map(r -> {
            String categoryName = categoryRepository.findById(r.getCategoryId())
                    .map(c -> c.getName()).orElse("Không tìm thấy");
            return Map.<String, Object>of(
                    "categoryId", r.getCategoryId(),
                    "categoryName", categoryName,
                    "rate", r.getRate(),
                    "updatedAt", r.getUpdatedAt() != null ? r.getUpdatedAt().toString() : ""
            );
        }).collect(java.util.stream.Collectors.toList());
    }

    // Đặt tỉ lệ hoa hồng cho danh mục
    @PutMapping("/commission-rates/{categoryId}")
    public ResponseEntity<Map<String, Object>> setCommissionRate(
            @PathVariable String categoryId,
            @RequestBody Map<String, Double> body) {
        Double rate = body.get("rate");
        if (rate == null || rate < 0 || rate > 100) {
            return ResponseEntity.badRequest().build();
        }
        if (!categoryRepository.existsById(categoryId)) {
            return ResponseEntity.notFound().build();
        }
        CommissionRate commissionRate = CommissionRate.builder()
                .categoryId(categoryId)
                .rate(rate)
                .build();
        commissionRateRepository.save(commissionRate);
        return ResponseEntity.ok(Map.<String, Object>of("categoryId", categoryId, "rate", rate));
    }

    // Lấy tất cả danh mục kèm tỉ lệ hoa hồng (dùng cho form setting)
    @GetMapping("/commission-rates/categories")
    public List<Map<String, Object>> getCategoriesWithRates() {
        return categoryRepository.findAll().stream().map(cat -> {
            double rate = commissionRateRepository.findById(cat.getId())
                    .map(CommissionRate::getRate).orElse(0.0);
            return Map.<String, Object>of(
                    "categoryId", cat.getId(),
                    "categoryName", cat.getName(),
                    "rate", rate
            );
        }).collect(java.util.stream.Collectors.toList());
    }

    private ProductResponse mapToResponse(Product p) {
        List<String> imageUrls = p.getImages() != null
                ? p.getImages().stream().map(img -> img.getImageUrl()).collect(java.util.stream.Collectors.toList())
                : List.of();
        return ProductResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .description(p.getDescription())
                .price(p.getPrice())
                .stock(p.getStock())
                .categoryId(p.getCategory() != null ? p.getCategory().getId() : null)
                .categoryName(p.getCategory() != null ? p.getCategory().getName() : null)
                .sellerId(p.getSellerId())
                .status(p.getStatus())
                .ratingAvg(p.getRatingAvg())
                .ratingCount(p.getRatingCount())
                .soldCount(p.getSoldCount() != null ? p.getSoldCount() : 0)
                .discountPercent(p.getDiscountPercent())
                .verified(p.getVerified())
                .createdAt(p.getCreatedAt())
                .images(imageUrls)
                .build();
    }
}
