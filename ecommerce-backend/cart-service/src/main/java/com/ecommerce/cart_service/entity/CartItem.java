package com.ecommerce.cart_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "cart_items")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class CartItem {

    @Id
    private String id;

    private String productId;
    private String variantId;
    private String variantName;
    private String name;
    private String image;
    private String sellerId;

    private Integer quantity;
    private Double price;

    private LocalDateTime createdAt;

    @ManyToOne
    @JoinColumn(name = "cart_id")
    private Cart cart;

    @PrePersist
    public void prePersist() {
        this.id = UUID.randomUUID().toString();
        this.createdAt = LocalDateTime.now();
    }
}