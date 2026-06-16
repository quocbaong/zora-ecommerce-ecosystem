package com.ecommerce.order_service.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatusChangedEvent {
    private String orderId;
    private String userId;
    private String sellerId;
    private String status;
    private String note;
}
