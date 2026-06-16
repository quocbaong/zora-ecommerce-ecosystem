package com.ecommerce.order_service.repository;

import com.ecommerce.order_service.entity.RefundRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RefundRequestRepository extends JpaRepository<RefundRequest, String> {
    Optional<RefundRequest> findByOrderId(String orderId);
    List<RefundRequest> findBySellerId(String sellerId);
    List<RefundRequest> findByBuyerId(String buyerId);

    @org.springframework.data.jpa.repository.Query("SELECT r FROM RefundRequest r WHERE r.status = :status AND r.updatedAt < :thresholdDate")
    List<RefundRequest> findByStatusAndUpdatedAtBefore(@org.springframework.data.repository.query.Param("status") String status, @org.springframework.data.repository.query.Param("thresholdDate") java.time.LocalDateTime thresholdDate);
}
