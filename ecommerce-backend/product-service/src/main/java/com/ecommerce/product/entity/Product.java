package com.ecommerce.product.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;
import jakarta.persistence.Index;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
@Table(name = "products", indexes = {
    @Index(name = "idx_product_seller_status", columnList = "seller_id, status"),
    @Index(name = "idx_product_category_status", columnList = "category_id, status"),
    @Index(name = "idx_product_status_price", columnList = "status, price")
})
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(name = "seller_id", nullable = false, length = 36)
    private String sellerId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer stock;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(name = "rating_avg", precision = 3, scale = 2)
    private BigDecimal ratingAvg;

    @Column(name = "rating_count")
    private Integer ratingCount;

    @Column(name = "sold_count", nullable = false)
    @Builder.Default
    private Integer soldCount = 0;

    @Column(name = "discount_percent")
    private Integer discountPercent;

    private Boolean verified;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ProductStatus status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDate createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDate updatedAt;

    // Giá trị các trường thông tin chi tiết theo schema của danh mục.
    // Key trùng với CategoryAttribute.name (vd: {"material": "Cotton", "length_cm": 90}).
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> attributes = new HashMap<>();

    @Column(name = "weight_g")
    @Builder.Default
    private Integer weightG = 500;

    @Column(name = "length_cm")
    @Builder.Default
    private Integer lengthCm = 20;

    @Column(name = "width_cm")
    @Builder.Default
    private Integer widthCm = 15;

    @Column(name = "height_cm")
    @Builder.Default
    private Integer heightCm = 10;

     @OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
     private List<ProductImage> images;
     @OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
     private List<ProductVariant> variants;
}
