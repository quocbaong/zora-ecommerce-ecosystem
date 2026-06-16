package com.ecommerce.user_service.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminUserResponse {
    private String userId;
    private String name;
    private String email;
    private String phone;
    private String avatarUrl;
    private String role;
    private String status;
    private String statusReason;
    private LocalDateTime createdAt;
    private Boolean emailVerified;
}
