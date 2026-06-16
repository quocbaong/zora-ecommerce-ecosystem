package com.ecommerce.cart_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "carts")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class Cart {

    @Id
    private String id;

    @Column(name = "user_id", unique = true)
    private String userId;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    @OneToMany(mappedBy = "cart",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC")
    private List<CartItem> items = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        this.id = UUID.randomUUID().toString();
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}