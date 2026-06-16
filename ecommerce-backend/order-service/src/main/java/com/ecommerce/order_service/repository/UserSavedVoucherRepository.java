package com.ecommerce.order_service.repository;

import com.ecommerce.order_service.entity.UserSavedVoucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserSavedVoucherRepository extends JpaRepository<UserSavedVoucher, String> {
    List<UserSavedVoucher> findByUserId(String userId);

    boolean existsByUserIdAndVoucherId(String userId, String voucherId);

    void deleteByUserIdAndVoucherId(String userId, String voucherId);
}
