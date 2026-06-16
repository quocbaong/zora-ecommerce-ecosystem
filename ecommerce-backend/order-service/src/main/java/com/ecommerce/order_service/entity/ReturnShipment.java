package com.ecommerce.order_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "return_shipments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnShipment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refund_request_id", unique = true)
    private RefundRequest refundRequest;

    private String shippingMethod; // PICKUP, DROP_OFF, SELF_ARRANGE

    private String trackingCode;

    private String carrier;

    private String status; // PENDING, DELIVERED

    private LocalDateTime shippedAt;
    
    private LocalDateTime receivedAt;
}
