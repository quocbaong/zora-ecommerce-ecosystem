package com.ecommerce.notification_service.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SellerApplicationDecidedEvent {
    private String userId;
    private String userEmail;
    private String status;
    private String shopName;
    private String reason;
}
