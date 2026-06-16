package com.ecommerce.user_service.repository;

import com.ecommerce.user_service.entity.SellerFollow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SellerFollowRepository extends JpaRepository<SellerFollow, String> {

    Optional<SellerFollow> findByUserIdAndSellerId(String userId, String sellerId);

    List<SellerFollow> findByUserId(String userId);

    boolean existsByUserIdAndSellerId(String userId, String sellerId);

    long countBySellerId(String sellerId);

    long countByUserId(String userId);

    void deleteByUserIdAndSellerId(String userId, String sellerId);
}
