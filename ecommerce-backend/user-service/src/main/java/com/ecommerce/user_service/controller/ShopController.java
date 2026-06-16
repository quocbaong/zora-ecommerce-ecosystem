package com.ecommerce.user_service.controller;

import com.ecommerce.user_service.dto.FollowStatusResponse;
import com.ecommerce.user_service.dto.ShopInfoResponse;
import com.ecommerce.user_service.dto.UserResponse;
import com.ecommerce.user_service.repository.SellerProfileRepository;
import com.ecommerce.user_service.service.SellerFollowService;
import com.ecommerce.user_service.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users/shops")
@RequiredArgsConstructor
public class ShopController {

    private final SellerFollowService followService;
    private final UserService userService;
    private final SellerProfileRepository sellerProfileRepository;

    @GetMapping("/{sellerId}")
    public ResponseEntity<ShopInfoResponse> getShop(
            @PathVariable("sellerId") String sellerId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        UserResponse seller = userService.getProfileById(sellerId);
        FollowStatusResponse status = followService.getStatus(sellerId, userId);
        String shopName = sellerProfileRepository.findById(sellerId)
                .map(p -> p.getShopName() != null ? p.getShopName() : seller.getFullName())
                .orElse(seller.getFullName());
        return ResponseEntity.ok(ShopInfoResponse.builder()
                .sellerId(seller.getId())
                .shopName(shopName)
                .avatarUrl(seller.getAvatarUrl())
                .email(seller.getEmail())
                .joinedAt(seller.getCreatedAt())
                .followerCount(status.getFollowerCount())
                .followingCount(status.getFollowingCount())
                .following(status.isFollowing())
                .build());
    }

    @PostMapping("/{sellerId}/follow")
    public ResponseEntity<Void> follow(
            @PathVariable("sellerId") String sellerId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        followService.follow(userId, sellerId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{sellerId}/follow")
    public ResponseEntity<Void> unfollow(
            @PathVariable("sellerId") String sellerId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        followService.unfollow(userId, sellerId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{sellerId}/follow-status")
    public ResponseEntity<FollowStatusResponse> getFollowStatus(
            @PathVariable("sellerId") String sellerId,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        return ResponseEntity.ok(followService.getStatus(sellerId, userId));
    }

    @GetMapping("/followed")
    public ResponseEntity<List<ShopInfoResponse>> getFollowedShops(
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(followService.getFollowedShops(userId));
    }
}
