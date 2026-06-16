package com.ecommerce.notification_service.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatusChangedEvent {
    private String orderId;
    private String userId;
    private String sellerId;
    private String status;
    private String note;
}
