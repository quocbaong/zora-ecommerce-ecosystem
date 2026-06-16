package com.ecommerce.user_service.service.impl;

import com.ecommerce.user_service.entity.Wallet;
import com.ecommerce.user_service.entity.WalletTransaction;
import com.ecommerce.user_service.entity.WithdrawalRequest;
import com.ecommerce.user_service.repository.WalletRepository;
import com.ecommerce.user_service.repository.WalletTransactionRepository;
import com.ecommerce.user_service.repository.WithdrawalRequestRepository;
import com.ecommerce.user_service.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletServiceImpl implements WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final WithdrawalRequestRepository withdrawalRequestRepository;

    @Override
    @Transactional
    public void createWalletIfNotExists(String userId, String walletType) {
        walletRepository.findByUserId(userId).orElseGet(() -> {
            Wallet newWallet = Wallet.builder()
                    .userId(userId)
                    .walletType(walletType)
                    .availableBalance(0.0)
                    .escrowBalance(0.0)
                    .build();
            return walletRepository.save(newWallet);
        });
    }

    @Override
    @Transactional
    public void addAvailableBalance(String userId, Double amount, String description, String orderId) {
        Wallet wallet = getWallet(userId);
        wallet.setAvailableBalance(wallet.getAvailableBalance() + amount);
        walletRepository.save(wallet);

        createTransaction(wallet.getId(), amount, "DEPOSIT", description, orderId);
    }

    @Override
    @Transactional
    public void subtractAvailableBalance(String userId, Double amount, String description, String orderId) {
        Wallet wallet = getWallet(userId);
        if (wallet.getAvailableBalance() < amount) {
            log.warn("Available balance is insufficient for deduction. Proceeding to negative or handling outside.");
            // Tùy nghiệp vụ, có thể cho phép âm ví hoặc throw exception. Tạm thời vẫn cho trừ (có thể âm)
        }
        wallet.setAvailableBalance(wallet.getAvailableBalance() - amount);
        walletRepository.save(wallet);

        createTransaction(wallet.getId(), -amount, "DEDUCT", description, orderId);
    }

    @Override
    @Transactional
    public void addEscrowBalance(String userId, Double amount, String description, String orderId) {
        Wallet wallet = getWallet(userId);
        wallet.setEscrowBalance(wallet.getEscrowBalance() + amount);
        walletRepository.save(wallet);

        createTransaction(wallet.getId(), amount, "ESCROW_DEPOSIT", description, orderId);
    }

    @Override
    @Transactional
    public void subtractEscrowBalance(String userId, Double amount, String description, String orderId) {
        Wallet wallet = getWallet(userId);
        if (wallet.getEscrowBalance() < amount) {
            log.warn("Escrow balance is insufficient for deduction.");
        }
        wallet.setEscrowBalance(wallet.getEscrowBalance() - amount);
        walletRepository.save(wallet);

        createTransaction(wallet.getId(), -amount, "ESCROW_DEDUCT", description, orderId);
    }

    @Override
    @Transactional
    public void releaseEscrowToAvailable(String userId, Double amount, String description, String orderId) {
        Wallet wallet = getWallet(userId);
        if (wallet.getEscrowBalance() < amount) {
            throw new RuntimeException("Escrow balance is insufficient");
        }
        wallet.setEscrowBalance(wallet.getEscrowBalance() - amount);
        wallet.setAvailableBalance(wallet.getAvailableBalance() + amount);
        walletRepository.save(wallet);

        createTransaction(wallet.getId(), amount, "ESCROW_RELEASE", description, orderId);
    }

    @Override
    @Transactional
    public void requestWithdrawal(String sellerId, Double amount, String bankName, String bankAccountNumber, String bankAccountName) {
        Wallet wallet = getWallet(sellerId);
        if (wallet.getAvailableBalance() < amount) {
            throw new RuntimeException("Insufficient available balance for withdrawal");
        }

        // Khóa tiền bằng cách trừ khỏi availableBalance (có thể tạo thêm bảng blocked_balance nếu muốn chi tiết hơn)
        wallet.setAvailableBalance(wallet.getAvailableBalance() - amount);
        walletRepository.save(wallet);

        WithdrawalRequest request = WithdrawalRequest.builder()
                .sellerId(sellerId)
                .amount(amount)
                .bankName(bankName)
                .bankAccountName(bankAccountName)
                .bankAccountNumber(bankAccountNumber)
                .status("PENDING")
                .build();
        withdrawalRequestRepository.save(request);

        createTransaction(wallet.getId(), -amount, "WITHDRAWAL_REQUEST", "Yêu cầu rút tiền " + amount, null);
    }

    @Override
    @Transactional
    public void processWithdrawal(String requestId, boolean isApproved) {
        WithdrawalRequest request = withdrawalRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Withdrawal request not found"));

        if (!"PENDING".equals(request.getStatus())) {
            throw new RuntimeException("Request is not in PENDING state");
        }

        Wallet wallet = getWallet(request.getSellerId());

        if (isApproved) {
            request.setStatus("APPROVED");
            createTransaction(wallet.getId(), 0.0, "WITHDRAWAL_APPROVED", "Duyệt thành công lệnh rút tiền " + request.getAmount(), null);
        } else {
            request.setStatus("REJECTED");
            // Hoàn lại tiền vào availableBalance vì bị từ chối
            wallet.setAvailableBalance(wallet.getAvailableBalance() + request.getAmount());
            walletRepository.save(wallet);
            createTransaction(wallet.getId(), request.getAmount(), "WITHDRAWAL_REJECTED", "Hoàn lại tiền do lệnh rút bị từ chối " + request.getAmount(), null);
        }
        withdrawalRequestRepository.save(request);
    }

    @Override
    @Transactional(readOnly = true)
    public Wallet getWalletByUserId(String userId) {
        return walletRepository.findByUserId(userId).orElseGet(() -> {
            Wallet newWallet = Wallet.builder()
                    .userId(userId)
                    .walletType("SELLER")
                    .availableBalance(0.0)
                    .escrowBalance(0.0)
                    .build();
            return walletRepository.save(newWallet);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public List<WalletTransaction> getTransactionsByWalletId(String walletId) {
        return walletTransactionRepository.findByWalletIdOrderByCreatedAtDesc(walletId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WithdrawalRequest> getWithdrawalRequestsBySellerId(String sellerId) {
        return withdrawalRequestRepository.findBySellerIdOrderByCreatedAtDesc(sellerId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WithdrawalRequest> getAllWithdrawalRequests() {
        return withdrawalRequestRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private Wallet getWallet(String userId) {
        return walletRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Wallet not found for user: " + userId));
    }

    private void createTransaction(String walletId, Double amount, String type, String description, String orderId) {
        WalletTransaction tx = WalletTransaction.builder()
                .walletId(walletId)
                .amount(amount)
                .transactionType(type)
                .description(description)
                .orderId(orderId)
                .build();
        walletTransactionRepository.save(tx);
    }
}
