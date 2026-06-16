package com.ecommerce.user_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "seller_follows",
    uniqueConstraints = @UniqueConstraint(name = "uk_user_seller", columnNames = {"user_id", "seller_id"}),
    indexes = {
        @Index(name = "idx_follow_seller", columnList = "seller_id"),
        @Index(name = "idx_follow_user", columnList = "user_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SellerFollow {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "seller_id", nullable = false)
    private String sellerId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
