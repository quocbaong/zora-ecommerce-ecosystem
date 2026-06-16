package com.ecommerce.user_service.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BanAppealSubmittedEvent {
    private String appealId;
    private String email;
    private String reason;
}
