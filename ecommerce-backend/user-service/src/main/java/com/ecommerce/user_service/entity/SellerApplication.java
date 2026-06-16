package com.ecommerce.user_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "seller_applications", uniqueConstraints = {
        @UniqueConstraint(columnNames = "id_number"),
        @UniqueConstraint(columnNames = "tax_code")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SellerApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @Column(name = "user_id", nullable = false, unique = true, length = 36)
    private String userId;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    // Shop info
    @Column(name = "shop_name", nullable = false, length = 100)
    private String shopName;

    @Column(name = "shop_description", columnDefinition = "TEXT")
    private String shopDescription;

    @Column(name = "main_category", length = 100)
    private String mainCategory;

    @Column(name = "warehouse_address", columnDefinition = "TEXT")
    private String warehouseAddress;

    @Column(name = "warehouse_street", length = 255)
    private String warehouseStreet;

    @Column(name = "warehouse_province", length = 100)
    private String warehouseProvince;

    @Column(name = "warehouse_district", length = 100)
    private String warehouseDistrict;

    @Column(name = "warehouse_ward", length = 100)
    private String warehouseWard;

    @Column(name = "warehouse_ghn_province_id")
    private Integer warehouseGhnProvinceId;

    @Column(name = "warehouse_ghn_district_id")
    private Integer warehouseGhnDistrictId;

    @Column(name = "warehouse_ghn_ward_code", length = 32)
    private String warehouseGhnWardCode;

    // Account type
    @Column(name = "account_type", nullable = false, length = 20)
    @Builder.Default
    private String accountType = "INDIVIDUAL";

    // KYC — individual
    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "id_number", length = 20)
    private String idNumber;

    @Column(name = "id_front_url", columnDefinition = "TEXT")
    private String idFrontUrl;

    @Column(name = "id_back_url", columnDefinition = "TEXT")
    private String idBackUrl;

    @Column(name = "selfie_url", columnDefinition = "TEXT")
    private String selfieUrl;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "permanent_address", columnDefinition = "TEXT")
    private String permanentAddress;

    // OCR results
    @Column(name = "ocr_full_name", length = 100)
    private String ocrFullName;

    @Column(name = "ocr_id_number", length = 20)
    private String ocrIdNumber;

    @Column(name = "ocr_match")
    private Boolean ocrMatch;

    // KYC — business (nullable for INDIVIDUAL)
    @Column(name = "business_name", length = 200)
    private String businessName;

    @Column(name = "tax_code", length = 20)
    private String taxCode;

    @Column(name = "business_license_url", columnDefinition = "TEXT")
    private String businessLicenseUrl;

    // Bank info
    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_account", length = 50)
    private String bankAccount;

    @Column(name = "bank_holder", length = 100)
    private String bankHolder;

    @Column(name = "bank_branch", length = 100)
    private String bankBranch;

    @Column(name = "bank_name_match")
    private Boolean bankNameMatch;

    // Resubmit tracking
    @Column(name = "resubmit_count")
    @Builder.Default
    private Integer resubmitCount = 0;

    @Column(name = "last_resubmit_at")
    private LocalDateTime lastResubmitAt;

    // Admin review
    @Column(name = "reviewed_by", length = 36)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    // Audit
    @Column(name = "submitted_ip", length = 45)
    private String submittedIp;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
