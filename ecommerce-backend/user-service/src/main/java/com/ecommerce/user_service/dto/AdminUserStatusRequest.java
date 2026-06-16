package com.ecommerce.user_service.dto;

import lombok.Data;

@Data
public class AdminUserStatusRequest {
    private String status;  // ACTIVE or BANNED
    private String reason;
}
