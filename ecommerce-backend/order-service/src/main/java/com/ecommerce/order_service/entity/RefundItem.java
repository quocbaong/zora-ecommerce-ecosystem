package com.ecommerce.order_service.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "refund_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refund_request_id")
    private RefundRequest refundRequest;

    private String orderItemId;

    private Integer quantity;

    private Double refundAmount;
}
