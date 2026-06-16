package com.ecommerce.product.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "product_variants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, length = 100)
    private String name; // Nhãn gộp: "{color} {size}" — giữ cho tương thích ngược

    @Column(length = 60)
    private String color;

    @Column(length = 30)
    private String size;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price; // Giá riêng cho biến thể này (có thể chênh lệch với giá gốc)

    @Column(nullable = false)
    private Integer stock; // Tồn kho chỉ riêng màu/size này

    @Column(length = 100)
    private String sku; // Mã quản lý kho hàng (nếu có)

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
