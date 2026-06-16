package com.ecommerce.user_service.controller;

import com.ecommerce.user_service.entity.Wallet;
import com.ecommerce.user_service.entity.WalletTransaction;
import com.ecommerce.user_service.entity.WithdrawalRequest;
import com.ecommerce.user_service.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/users/v1/wallets")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    // Lấy thông tin ví và lịch sử giao dịch/rút tiền của tôi
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyWalletDetails(@RequestHeader("X-User-Id") String userId) {
        Wallet wallet = walletService.getWalletByUserId(userId);
        List<WalletTransaction> transactions = walletService.getTransactionsByWalletId(wallet.getId());
        List<WithdrawalRequest> withdrawals = walletService.getWithdrawalRequestsBySellerId(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("wallet", wallet);
        response.put("transactions", transactions);
        response.put("withdrawals", withdrawals);
        return ResponseEntity.ok(response);
    }

    // Admin lấy toàn bộ lệnh rút tiền đang chờ duyệt
    @GetMapping("/admin/withdrawals")
    public ResponseEntity<List<WithdrawalRequest>> getAdminWithdrawals(
            @RequestHeader("X-Role") String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(walletService.getAllWithdrawalRequests());
    }

    // Seller tạo lệnh rút tiền
    @PostMapping("/withdraw")
    public ResponseEntity<Map<String, String>> requestWithdrawal(
            @RequestHeader("X-User-Id") String sellerId,
            @RequestBody Map<String, Object> request) {

        Double amount = Double.valueOf(request.get("amount").toString());
        String bankName = (String) request.get("bankName");
        String bankAccountNumber = (String) request.get("bankAccountNumber");
        String bankAccountName = (String) request.get("bankAccountName");

        walletService.requestWithdrawal(sellerId, amount, bankName, bankAccountNumber, bankAccountName);

        return ResponseEntity.ok(Map.of("message", "Yêu cầu rút tiền đã được tạo thành công"));
    }

    // Admin duyệt hoặc từ chối lệnh rút tiền
    @PostMapping("/admin/withdrawals/{requestId}/process")
    public ResponseEntity<Map<String, String>> processWithdrawal(
            @PathVariable String requestId,
            @RequestBody Map<String, Object> request) {

        boolean isApproved = (Boolean) request.get("isApproved");
        walletService.processWithdrawal(requestId, isApproved);

        String status = isApproved ? "duyệt" : "từ chối";
        return ResponseEntity.ok(Map.of("message", "Lệnh rút tiền đã được " + status));
    }
}
