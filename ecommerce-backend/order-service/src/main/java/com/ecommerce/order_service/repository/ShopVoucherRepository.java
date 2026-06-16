package com.ecommerce.order_service.repository;

import com.ecommerce.order_service.entity.ShopVoucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ShopVoucherRepository extends JpaRepository<ShopVoucher, String> {

    List<ShopVoucher> findBySellerIdOrderByCreatedAtDesc(String sellerId);

    // Chỉ trả voucher public (targetUserId IS NULL) cho danh sách shop công khai
    @Query("SELECT v FROM ShopVoucher v WHERE v.sellerId = :sellerId AND v.active = true " +
           "AND v.targetUserId IS NULL " +
           "AND (v.expiresAt IS NULL OR v.expiresAt > :now) " +
           "AND (v.usageLimit IS NULL OR v.usedCount < v.usageLimit) " +
           "ORDER BY v.createdAt DESC")
    List<ShopVoucher> findActiveBySellerId(@Param("sellerId") String sellerId,
                                           @Param("now") LocalDateTime now);

    @Query("SELECT v FROM ShopVoucher v WHERE v.active = true " +
           "AND v.targetUserId IS NULL " +
           "AND (v.expiresAt IS NULL OR v.expiresAt > :now) " +
           "AND (v.usageLimit IS NULL OR v.usedCount < v.usageLimit) " +
           "ORDER BY v.createdAt DESC")
    List<ShopVoucher> findAllActivePublic(@Param("now") LocalDateTime now);
}
