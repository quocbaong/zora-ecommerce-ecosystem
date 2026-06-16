package com.ecommerce.order_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "shop_vouchers",
    indexes = {
        @Index(name = "idx_voucher_seller", columnList = "seller_id, active"),
        @Index(name = "idx_voucher_code", columnList = "code"),
        @Index(name = "idx_voucher_target", columnList = "target_user_id")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopVoucher {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @Column(name = "seller_id", nullable = false, length = 36)
    private String sellerId;

    // Nếu khác null → voucher private, chỉ user này thấy/dùng được. Null = public.
    @Column(name = "target_user_id", length = 36)
    private String targetUserId;

    @Column(nullable = false, length = 32)
    private String code;

    @Column(length = 200)
    private String title;

    // PERCENT, FIXED
    @Column(name = "discount_type", nullable = false, length = 16)
    private String discountType;

    @Column(name = "discount_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "min_order_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal minOrderAmount = BigDecimal.ZERO;

    @Column(name = "max_discount", precision = 12, scale = 2)
    private BigDecimal maxDiscount;

    @Column(name = "usage_limit")
    private Integer usageLimit;

    @Column(name = "used_count", nullable = false)
    @Builder.Default
    private Integer usedCount = 0;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
