package com.ecommerce.user_service.controller;

import com.ecommerce.user_service.entity.User;
import com.ecommerce.user_service.repository.UserRepository;
import com.ecommerce.user_service.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/internal/wallets")
@RequiredArgsConstructor
@Slf4j
public class InternalWalletController {

    private final WalletService walletService;
    private final UserRepository userRepository;

    @PostMapping("/settlement")
    public ResponseEntity<Void> processSettlement(@RequestBody Map<String, Object> request) {
        String orderId = (String) request.get("orderId");
        Double totalAmount = Double.valueOf(request.get("totalAmount").toString());
        String sellerId = (String) request.get("sellerId");
        String orderName = request.containsKey("orderName") ? (String) request.get("orderName") : orderId;
        
        Object commissionObj = request.get("commissionFee");
        Double commissionFee = commissionObj != null ? Double.valueOf(commissionObj.toString()) : totalAmount * 0.05;

        Object shippingObj = request.get("shippingFee");
        Double shippingFee = shippingObj != null ? Double.valueOf(shippingObj.toString()) : 0.0;
        
        Object isDirectObj = request.get("isDirectAvailable");
        boolean isDirectAvailable = isDirectObj != null && Boolean.parseBoolean(isDirectObj.toString());

        Double adminRevenue = commissionFee + shippingFee;
        Double sellerAmount = totalAmount - commissionFee - shippingFee;

        log.info("Starting settlement for Order: {}. Admin Revenue: {}, Seller Amount: {}, DirectToAvailable: {}", orderId, adminRevenue, sellerAmount, isDirectAvailable);

        // 1. Tìm tài khoản Admin thật trong hệ thống
        String adminId = userRepository.findFirstByRole("ADMIN")
                .map(User::getUserId)
                .orElse("ADMIN");

        // 2. Tạo ví Admin nếu chưa có
        walletService.createWalletIfNotExists(adminId, "ADMIN");
        // 3. Cộng doanh thu (Hoa hồng + Ship) vào Ví Khả Dụng của Admin
        walletService.addAvailableBalance(adminId, adminRevenue, "Doanh thu (Hoa hồng + Ship) từ đơn: " + orderName, orderId);

        // 4. Tạo ví Seller nếu chưa có
        walletService.createWalletIfNotExists(sellerId, "SELLER");
        
        // 5. Cộng tiền cho Seller
        if (isDirectAvailable) {
            walletService.addAvailableBalance(sellerId, sellerAmount, "Tiền bán hàng: " + orderName, orderId);
        } else {
            walletService.addEscrowBalance(sellerId, sellerAmount, "Tiền bán hàng chờ giao: " + orderName, orderId);
        }

        return ResponseEntity.ok().build();
    }

    @PostMapping("/escrow/release")
    public ResponseEntity<Void> releaseEscrow(@RequestBody Map<String, Object> request) {
        String orderId = (String) request.get("orderId");
        String sellerId = (String) request.get("sellerId");
        Double amount = Double.valueOf(request.get("amount").toString());
        String orderName = request.containsKey("orderName") ? (String) request.get("orderName") : orderId;

        log.info("Releasing escrow for Order: {}. Seller: {}, Amount: {}", orderId, sellerId, amount);
        walletService.releaseEscrowToAvailable(sellerId, amount, "Giải phóng tiền đơn hàng: " + orderName, orderId);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/refund")
    public ResponseEntity<Void> processRefund(@RequestBody Map<String, Object> request) {
        String orderId = (String) request.get("orderId");
        String buyerId = (String) request.get("buyerId");
        String sellerId = (String) request.get("sellerId");
        String paymentMethod = (String) request.get("paymentMethod");
        String orderName = request.containsKey("orderName") ? (String) request.get("orderName") : orderId;
        
        Double totalAmount = Double.valueOf(request.get("totalAmount").toString());
        Double commissionFee = request.get("commissionFee") != null ? Double.valueOf(request.get("commissionFee").toString()) : 0.0;
        Double shippingFee = request.get("shippingFee") != null ? Double.valueOf(request.get("shippingFee").toString()) : 0.0;

        Double adminRevenue = commissionFee + shippingFee;
        Double sellerAmount = totalAmount - commissionFee - shippingFee;

        log.info("Starting REFUND rollback for Order: {}. PaymentMethod: {}, Admin Revenue Deduct: {}, Seller Amount Deduct: {}", 
                 orderId, paymentMethod, adminRevenue, sellerAmount);

        // 1. Lấy ID Admin
        String adminId = userRepository.findFirstByRole("ADMIN")
                .map(User::getUserId)
                .orElse("ADMIN");

        boolean isDelivered = request.containsKey("isDelivered") && Boolean.parseBoolean(request.get("isDelivered").toString());

        // 2. Trừ tiền Hoa hồng + Ship khỏi Ví Admin
        walletService.subtractAvailableBalance(adminId, adminRevenue, "Hoàn trả (Hoa hồng + Ship) cho đơn khiếu nại: " + orderName, orderId);

        // 3. Xử lý ví Seller tùy theo tình trạng giao hàng
        boolean isMoneyInAvailable = "COD".equals(paymentMethod) || isDelivered;

        if (isMoneyInAvailable) {
            // Đơn đã giao (hoặc COD) -> Tiền đã vào Ví Khả Dụng -> Trừ từ Ví Khả Dụng
            walletService.subtractAvailableBalance(sellerId, sellerAmount, "Trừ tiền bồi hoàn cho đơn khiếu nại: " + orderName, orderId);
        } else {
            // Đơn chưa giao (Online) -> Tiền đang bị giam -> Hủy lệnh giam tiền
            walletService.subtractEscrowBalance(sellerId, sellerAmount, "Thu hồi tạm giữ do khách khiếu nại: " + orderName, orderId);
        }

        // 4. Nếu là đơn COD / PayOS, cần cộng tiền vào Ví Buyer (Vì tiền không tự hoàn qua cổng được)
        if ("COD".equals(paymentMethod) || "PAYOS".equals(paymentMethod)) {
            walletService.createWalletIfNotExists(buyerId, "BUYER");
            walletService.addAvailableBalance(buyerId, totalAmount, "Hoàn tiền đơn hàng khiếu nại: " + orderName, orderId);
        } else {
            // Đối với STRIPE/MOMO, tiền của Buyer sẽ được xử lý trả về thẻ qua Cổng thanh toán
            log.info("STRIPE/MOMO refund: Không cộng vào ví Buyer, chờ gateway xử lý.");
        }

        return ResponseEntity.ok().build();
    }
}
