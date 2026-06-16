package com.ecommerce.notification_service.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PaymentSuccessEvent {
    private String orderId;
    private String userId;
    private Double amount;
    private String method;
}
