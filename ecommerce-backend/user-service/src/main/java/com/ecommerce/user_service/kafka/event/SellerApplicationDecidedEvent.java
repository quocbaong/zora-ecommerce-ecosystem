package com.ecommerce.user_service.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SellerApplicationDecidedEvent {
    private String userId;
    private String userEmail;
    private String status;       // APPROVED or REJECTED
    private String shopName;
    private String reason;       // rejection reason, null if approved
}
