package com.ecommerce.order_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String userId;  

    private Double totalPrice;

    private Double discount;

    private String status; // PENDING, CONFIRMED, SHIPPING, DELIVERED, CANCELLED

    private String paymentMethod; // COD, STRIPE
    
    private String paymentStatus; // PENDING, PAID, FAILED

    private String trackingNumber;
    private String shippingProvider;
    private LocalDate estimatedDeliveryDate;
    private LocalDateTime deliveredAt;
    


    @Column(name = "voucher_id", length = 36)
    private String voucherId;

    @Column(name = "discount_amount")
    private Double discountAmount;

    @Column(name = "shipping_fee")
    private Double shippingFee;

    @Column(name = "total_commission_fee")
    private Double totalCommissionFee;

    @Embedded
    private ShippingAddress shippingAddress;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
}