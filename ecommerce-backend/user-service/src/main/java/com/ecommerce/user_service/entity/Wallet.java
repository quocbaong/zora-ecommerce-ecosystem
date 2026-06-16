package com.ecommerce.user_service.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "wallets")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", unique = true, nullable = false)
    private String userId; // ID của Seller hoặc Admin

    @Column(name = "wallet_type", nullable = false)
    private String walletType; // ADMIN, SELLER

    @Column(name = "available_balance", nullable = false)
    @Builder.Default
    private Double availableBalance = 0.0;

    @Column(name = "escrow_balance", nullable = false)
    @Builder.Default
    private Double escrowBalance = 0.0;

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
