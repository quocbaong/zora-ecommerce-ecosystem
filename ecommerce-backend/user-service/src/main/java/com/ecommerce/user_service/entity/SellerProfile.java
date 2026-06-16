package com.ecommerce.user_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "seller_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SellerProfile {

    @Id
    @Column(name = "seller_id", length = 36, updatable = false, nullable = false)
    private String sellerId;

    @Column(name = "shop_name", nullable = false, length = 100)
    private String shopName;

    @Column(name = "shop_description", columnDefinition = "TEXT")
    private String shopDescription;

    @Column(name = "avatar_url", columnDefinition = "TEXT")
    private String avatarUrl;

    @Column(name = "banner_url", columnDefinition = "TEXT")
    private String bannerUrl;

    @Column(name = "account_type", length = 20)
    private String accountType;

    @Column(name = "tax_code", length = 20)
    private String taxCode;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_account", length = 50)
    private String bankAccount;

    @Column(name = "bank_holder", length = 100)
    private String bankHolder;

    @Column(name = "commission_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal commissionRate = new BigDecimal("5.00");

    @Column(name = "rating", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal rating = BigDecimal.ZERO;

    @Column(name = "total_sales")
    @Builder.Default
    private Long totalSales = 0L;

    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "status_reason", columnDefinition = "TEXT")
    private String statusReason;

    @Column(name = "is_verified")
    @Builder.Default
    private Boolean isVerified = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Warehouse address — dùng cho tính phí ship (from address)
    @Column(name = "warehouse_province", length = 100)
    private String warehouseProvince;

    @Column(name = "warehouse_district", length = 100)
    private String warehouseDistrict;

    @Column(name = "warehouse_ward", length = 100)
    private String warehouseWard;

    @Column(name = "warehouse_street", length = 255)
    private String warehouseStreet;

    @Column(name = "warehouse_phone", length = 20)
    private String warehousePhone;

    @Column(name = "warehouse_ghn_province_id")
    private Integer warehouseGhnProvinceId;

    @Column(name = "warehouse_ghn_district_id")
    private Integer warehouseGhnDistrictId;

    @Column(name = "warehouse_ghn_ward_code", length = 32)
    private String warehouseGhnWardCode;
}
