package com.ecommerce.user_service.service;

import com.ecommerce.user_service.dto.FollowStatusResponse;
import com.ecommerce.user_service.dto.ShopInfoResponse;
import java.util.List;

public interface SellerFollowService {
    void follow(String userId, String sellerId);

    void unfollow(String userId, String sellerId);

    FollowStatusResponse getStatus(String sellerId, String userId);

    List<ShopInfoResponse> getFollowedShops(String userId);
}
