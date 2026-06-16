package com.ecommerce.user_service.repository;

import com.ecommerce.user_service.entity.WalletTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, String> {
    List<WalletTransaction> findByWalletIdOrderByCreatedAtDesc(String walletId);
}
