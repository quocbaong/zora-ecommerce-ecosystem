package com.ecommerce.order_service.controller;

import com.ecommerce.order_service.entity.Order;
import com.ecommerce.order_service.entity.PaymentTransaction;
import com.ecommerce.order_service.dto.response.OrderResponse;
import com.ecommerce.order_service.repository.OrderRepository;
import com.ecommerce.order_service.repository.PaymentTransactionRepository;
import com.ecommerce.order_service.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/internal/orders")
@RequiredArgsConstructor
@Slf4j
public class InternalOrderController {

    private final OrderRepository orderRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final RestTemplate restTemplate;
    private final OrderService orderService;

    @Value("${services.user-url}")
    private String userServiceUrl;

    @PostMapping("/{orderId}/payment-success")
    @Transactional
    public ResponseEntity<Void> handlePaymentSuccess(@PathVariable String orderId, @RequestBody Map<String, Object> paymentData) {
        log.info("Processing internal payment success callback for order: {}", orderId);
        
        Order order = orderRepository.findByIdWithLock(orderId).orElse(null);
        if (order == null) {
            log.error("Order not found: {}", orderId);
            return ResponseEntity.notFound().build();
        }

        // Idempotency: Tránh webhook gọi nhiều lần
        if ("PAID".equals(order.getPaymentStatus())) {
            log.info("Order {} is already PAID. Idempotency check passed.", orderId);
            return ResponseEntity.ok().build();
        }

        // 1. Cập nhật trạng thái đơn hàng
        order.setPaymentStatus("PAID");
        order.setStatus("CONFIRMED"); // Đơn thanh toán xong tự động nhảy sang Xác Nhận
        orderRepository.save(order);

        // 2. Lưu lịch sử giao dịch (PaymentTransaction)
        Double totalPaid = order.getTotalPrice();
        
        PaymentTransaction transaction = PaymentTransaction.builder()
                .orderId(orderId)
                .provider((String) paymentData.get("provider"))
                .providerTransactionId((String) paymentData.get("providerTransactionId"))
                .amount(totalPaid)
                .status("SUCCESS")
                .rawResponse((String) paymentData.get("rawResponse"))
                .build();
        paymentTransactionRepository.save(transaction);

        // 3. Gọi User Service để cộng tiền Tạm giữ (Escrow) vào ví Seller
        try {
            String settlementUrl = userServiceUrl + "/api/v1/internal/wallets/settlement";
            Double commission = order.getTotalCommissionFee() != null ? order.getTotalCommissionFee() : totalPaid * 0.05;
            Double shippingFee = order.getShippingFee() != null ? order.getShippingFee() : 0.0;
            String orderName = getOrderName(order);
            Map<String, Object> settlementRequest = Map.of(
                    "orderId", orderId,
                    "orderName", orderName,
                    "totalAmount", totalPaid,
                    "commissionFee", commission,
                    "shippingFee", shippingFee,
                    "isDirectAvailable", false,
                    "sellerId", getSellerIdFromOrder(order)
            );
            restTemplate.postForEntity(settlementUrl, settlementRequest, Void.class);
        } catch(Exception e) {
            log.error("Failed to call Wallet Settlement for order {}", orderId, e);
        }

        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/refund/approve")
    public ResponseEntity<OrderResponse> approveRefund(@PathVariable String id) {
        return ResponseEntity.ok(orderService.approveRefund(id, "Hệ thống tự động đồng ý hoàn tiền (Internal)."));
    }

    @PostMapping("/{id}/refund/reject")
    public ResponseEntity<OrderResponse> rejectRefund(@PathVariable String id) {
        return ResponseEntity.ok(orderService.rejectRefund(id, "Hệ thống tự động từ chối hoàn tiền (Internal)."));
    }

    private String getSellerIdFromOrder(Order order) {
        if (order.getItems() != null && !order.getItems().isEmpty()) {
            return order.getItems().get(0).getSellerId();
        }
        return "UNKNOWN_SELLER";
    }

    private String getOrderName(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return order.getId();
        }
        String name = order.getItems().get(0).getProductName();
        if (order.getItems().size() > 1) {
            name += " và " + (order.getItems().size() - 1) + " sản phẩm khác";
        }
        return name;
    }
}
