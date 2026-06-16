package com.ecommerce.user_service.repository;

import com.ecommerce.user_service.entity.WithdrawalRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WithdrawalRequestRepository extends JpaRepository<WithdrawalRequest, String> {
    List<WithdrawalRequest> findBySellerIdOrderByCreatedAtDesc(String sellerId);
}
