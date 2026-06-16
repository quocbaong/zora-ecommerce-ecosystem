package com.ecommerce.product.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "shop_category_products",
    uniqueConstraints = @UniqueConstraint(name = "uk_shop_cat_product", columnNames = {"shop_category_id", "product_id"}),
    indexes = @Index(name = "idx_shop_cat_product_cat", columnList = "shop_category_id")
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopCategoryProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @Column(name = "shop_category_id", nullable = false, length = 36)
    private String shopCategoryId;

    @Column(name = "product_id", nullable = false, length = 36)
    private String productId;
}
