package com.ecommerce.order_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "user_saved_vouchers",
    uniqueConstraints = @UniqueConstraint(name = "uk_user_voucher", columnNames = {"user_id", "voucher_id"}),
    indexes = @Index(name = "idx_saved_user", columnList = "user_id")
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSavedVoucher {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(name = "voucher_id", nullable = false, length = 36)
    private String voucherId;

    @CreationTimestamp
    @Column(name = "saved_at", updatable = false)
    private LocalDateTime savedAt;
}
