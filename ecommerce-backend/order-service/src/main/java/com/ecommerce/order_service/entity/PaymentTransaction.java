package com.ecommerce.order_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "order_id", nullable = false)
    private String orderId;

    @Column(name = "provider", nullable = false)
    private String provider; // MOMO, PAYOS, STRIPE

    @Column(name = "provider_transaction_id")
    private String providerTransactionId;

    private Double amount;

    private String status; // SUCCESS, FAILED

    @Column(name = "raw_response", columnDefinition = "TEXT")
    private String rawResponse;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
