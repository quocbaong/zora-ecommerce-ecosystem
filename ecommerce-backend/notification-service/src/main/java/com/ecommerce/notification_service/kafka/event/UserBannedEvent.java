package com.ecommerce.notification_service.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserBannedEvent {
    private String userId;
    private String email;
    private String name;
    private String reason;
}
