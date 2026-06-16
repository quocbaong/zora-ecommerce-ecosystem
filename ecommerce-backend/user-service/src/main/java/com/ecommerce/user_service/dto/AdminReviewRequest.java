package com.ecommerce.user_service.dto;

import lombok.Data;

@Data
public class AdminReviewRequest {
    private String reason;
    private String adminNotes;
}
