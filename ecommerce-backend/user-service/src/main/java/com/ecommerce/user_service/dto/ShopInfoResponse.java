package com.ecommerce.user_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopInfoResponse {
    private String sellerId;
    private String shopName;
    private String avatarUrl;
    private String email;
    private LocalDateTime joinedAt;
    private long followerCount;
    private long followingCount;
    private boolean following;
}
