package com.ecommerce.user_service.service.impl;

import com.ecommerce.user_service.dto.FollowStatusResponse;
import com.ecommerce.user_service.dto.ShopInfoResponse;
import com.ecommerce.user_service.entity.SellerFollow;
import com.ecommerce.user_service.repository.SellerFollowRepository;
import com.ecommerce.user_service.repository.UserRepository;
import com.ecommerce.user_service.service.SellerFollowService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SellerFollowServiceImpl implements SellerFollowService {

    private final SellerFollowRepository followRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public void follow(String userId, String sellerId) {
        if (userId == null || sellerId == null) {
            throw new RuntimeException("INVALID_INPUT");
        }
        if (userId.equals(sellerId)) {
            throw new RuntimeException("CANNOT_FOLLOW_SELF");
        }
        userRepository.findByUserId(sellerId)
                .orElseThrow(() -> new RuntimeException("SELLER_NOT_FOUND"));
        if (followRepository.existsByUserIdAndSellerId(userId, sellerId)) {
            return;
        }
        followRepository.save(SellerFollow.builder()
                .userId(userId)
                .sellerId(sellerId)
                .build());
    }

    @Override
    @Transactional
    public void unfollow(String userId, String sellerId) {
        if (userId == null || sellerId == null) {
            throw new RuntimeException("INVALID_INPUT");
        }
        followRepository.deleteByUserIdAndSellerId(userId, sellerId);
    }

    @Override
    public FollowStatusResponse getStatus(String sellerId, String userId) {
        boolean following = userId != null && followRepository.existsByUserIdAndSellerId(userId, sellerId);
        long followerCount = followRepository.countBySellerId(sellerId);
        long followingCount = followRepository.countByUserId(sellerId);
        return FollowStatusResponse.builder()
                .following(following)
                .followerCount(followerCount)
                .followingCount(followingCount)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShopInfoResponse> getFollowedShops(String userId) {
        List<SellerFollow> follows = followRepository.findByUserId(userId);
        return follows.stream()
                .map(follow -> {
                    String sellerId = follow.getSellerId();
                    var sellerOpt = userRepository.findByUserId(sellerId);
                    if (sellerOpt.isEmpty()) {
                        return null;
                    }
                    var seller = sellerOpt.get();
                    long followerCount = followRepository.countBySellerId(sellerId);
                    long followingCount = followRepository.countByUserId(sellerId);
                    return ShopInfoResponse.builder()
                            .sellerId(sellerId)
                            .shopName(seller.getName())
                            .avatarUrl(seller.getAvatarUrl())
                            .email(seller.getEmail())
                            .joinedAt(seller.getCreatedAt())
                            .followerCount(followerCount)
                            .followingCount(followingCount)
                            .following(true)
                            .build();
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }
}
