package com.ecommerce.order_service.repository;

import com.ecommerce.order_service.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, String> {
    java.util.Optional<PaymentTransaction> findByOrderId(String orderId);
}
