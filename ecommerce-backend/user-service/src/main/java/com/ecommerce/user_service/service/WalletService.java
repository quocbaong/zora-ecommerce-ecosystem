package com.ecommerce.user_service.service;

import com.ecommerce.user_service.entity.Wallet;
import com.ecommerce.user_service.entity.WalletTransaction;
import com.ecommerce.user_service.entity.WithdrawalRequest;
import java.util.List;

public interface WalletService {
    void createWalletIfNotExists(String userId, String walletType);
    void addAvailableBalance(String userId, Double amount, String description, String orderId);
    void subtractAvailableBalance(String userId, Double amount, String description, String orderId);
    void addEscrowBalance(String userId, Double amount, String description, String orderId);
    void subtractEscrowBalance(String userId, Double amount, String description, String orderId);
    void releaseEscrowToAvailable(String userId, Double amount, String description, String orderId);
    void requestWithdrawal(String sellerId, Double amount, String bankName, String bankAccountNumber, String bankAccountName);
    void processWithdrawal(String requestId, boolean isApproved);

    Wallet getWalletByUserId(String userId);
    List<WalletTransaction> getTransactionsByWalletId(String walletId);
    List<WithdrawalRequest> getWithdrawalRequestsBySellerId(String sellerId);
    List<WithdrawalRequest> getAllWithdrawalRequests();
}
