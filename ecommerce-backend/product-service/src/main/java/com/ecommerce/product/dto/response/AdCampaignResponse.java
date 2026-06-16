package com.ecommerce.product.dto.response;

import com.ecommerce.product.entity.AdCampaignStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdCampaignResponse {
    private String id;
    private String sellerId;
    private String title;
    private String description;
    private String bannerUrl;
    private LocalDate startDate;
    private LocalDate endDate;
    private AdCampaignStatus status;
    private String rejectionReason;
    private LocalDateTime createdAt;
    private LocalDateTime reviewedAt;
}
