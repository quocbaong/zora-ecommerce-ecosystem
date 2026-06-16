package com.ecommerce.product.kafka.event;

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
    private String status;   // APPROVED / REJECTED
    private String reason;   // chỉ có khi REJECTED
}
