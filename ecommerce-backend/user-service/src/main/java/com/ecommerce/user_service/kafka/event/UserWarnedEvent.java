package com.ecommerce.user_service.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserWarnedEvent {
    private String userId;
    private String email;
    private String name;
    private int warningNumber;
    private String reason;
}
