package com.ecommerce.product.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "category_attributes", indexes = {
        @Index(name = "idx_category_attr_category", columnList = "category_id"),
        @Index(name = "uk_category_attr_category_name", columnList = "category_id, name", unique = true)
})
public class CategoryAttribute {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @Column(name = "category_id", nullable = false, length = 36)
    private String categoryId;

    // Key dùng làm khóa trong JSON attributes của product (vd: "material")
    @Column(nullable = false, length = 60)
    private String name;

    // Nhãn hiển thị cho seller (vd: "Chất liệu")
    @Column(nullable = false, length = 120)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttributeType type;

    @Column(nullable = false)
    @Builder.Default
    private Boolean required = false;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(length = 200)
    private String placeholder;
}
