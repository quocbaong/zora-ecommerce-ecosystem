package com.ecommerce.user_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_credit_cards")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCreditCard {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId; // maps to User.userId

    @Column(name = "card_brand", nullable = false)
    private String cardBrand; // Visa, Mastercard, JCB, etc.

    @Column(name = "last_4_digits", length = 4, nullable = false)
    private String last4Digits;

    @Column(name = "expiry_date", nullable = false)
    private String expiryDate; // MM/YY

    @Column(name = "card_holder_name", nullable = false)
    private String cardHolderName;

    @Column(name = "is_default")
    @Builder.Default
    private boolean isDefault = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
