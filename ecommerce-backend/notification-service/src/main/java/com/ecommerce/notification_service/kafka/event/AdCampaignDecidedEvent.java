package com.ecommerce.notification_service.kafka.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdCampaignDecidedEvent {
    private String campaignId;
    private String sellerId;
    private String title;
    private String status;
    private String reason;
}
