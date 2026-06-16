package com.ecommerce.order_service.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderResponse {

    private String id;

    private String userId;

    private Double totalPrice;

    private String voucherId;

    private Double discountAmount;

    private Double shippingFee;

    private String status;

    private String paymentMethod;
    
    private String paymentStatus;

    private String trackingNumber;
    private String shippingProvider;
    private java.time.LocalDate estimatedDeliveryDate;
    private LocalDateTime deliveredAt;

    private ShippingAddressResponse shippingAddress;

    private RefundRequestResponse refundRequest;

    private List<OrderItemResponse> items;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}