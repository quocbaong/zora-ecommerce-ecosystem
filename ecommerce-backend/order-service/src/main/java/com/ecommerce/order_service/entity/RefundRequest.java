package com.ecommerce.order_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "refund_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String orderId;

    private String buyerId;

    private String sellerId;

    private String type; // REFUND_ONLY, RETURN_AND_REFUND

    private String status; // REQUESTED, UNDER_REVIEW, WAITING_FOR_RETURN, RETURN_SHIPPING, RETURN_RECEIVED, REFUNDED, REJECTED

    @Column(length = 500)
    private String reason;

    private Double requestedAmount;

    private Double approvedAmount;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "evidence_urls", columnDefinition = "jsonb")
    private List<String> evidenceUrls;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "seller_evidence_urls", columnDefinition = "jsonb")
    private List<String> sellerEvidenceUrls;

    @Column(length = 500)
    private String sellerDisputeReason;

    @OneToMany(mappedBy = "refundRequest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<RefundItem> items = new ArrayList<>();

    @OneToOne(mappedBy = "refundRequest", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private ReturnShipment returnShipment;

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
