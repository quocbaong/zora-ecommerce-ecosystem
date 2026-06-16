package com.ecommerce.order_service.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    private String productId;

    private String productName;

    private String productImage;

    private Integer quantity;

    private Double price;

    private String variantId;

    private String sellerId;

    @Column(name = "commission_fee")
    private Double commissionFee;

    @Column(name = "subtotal")
    private Double subtotal;

    @PrePersist
    protected void calculateSubtotal() {
        if (price != null && quantity != null) {
            this.subtotal = price * quantity;
        }
    }
}
