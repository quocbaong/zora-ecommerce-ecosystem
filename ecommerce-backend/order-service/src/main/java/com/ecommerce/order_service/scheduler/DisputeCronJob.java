package com.ecommerce.order_service.scheduler;

import com.ecommerce.order_service.entity.Order;
import com.ecommerce.order_service.entity.RefundRequest;
import com.ecommerce.order_service.repository.OrderRepository;
import com.ecommerce.order_service.repository.RefundRequestRepository;
import com.ecommerce.order_service.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class DisputeCronJob {

    private final OrderRepository orderRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final OrderService orderService;
    private final RestTemplate restTemplate;

    @Value("${service.url.user:http://user-service:8081}")
    private String userServiceUrl;

    /**
     * 1. Hạn 15 ngày: Đơn hàng DELIVERED quá 15 ngày mà không có khiếu nại -> Đánh dấu hoàn tất & Nhả tiền Escrow
     */
    @Scheduled(cron = "0 0 * * * *") // Chạy mỗi giờ
    public void autoCloseDisputeWindow() {
        log.info("CronJob: Bắt đầu kiểm tra các đơn hàng quá hạn khiếu nại (15 ngày)");
        LocalDateTime threshold = LocalDateTime.now().minusDays(15);
        List<Order> expiredOrders = orderRepository.findExpiredDeliveredOrders(threshold);

        for (Order order : expiredOrders) {
            try {
                // Đổi trạng thái sang COMPLETED để khóa không cho khiếu nại nữa
                order.setStatus("COMPLETED");
                orderRepository.save(order);

                // Nếu là đơn đã thanh toán online, nhả tiền Escrow cho Seller
                if ("PAID".equals(order.getPaymentStatus())) {
                    String sellerId = order.getItems().isEmpty() ? "UNKNOWN_SELLER" : order.getItems().get(0).getSellerId();
                    double amount = order.getTotalPrice();
                    double commission = order.getTotalCommissionFee() != null ? order.getTotalCommissionFee() : amount * 0.05;
                    double shippingFee = order.getShippingFee() != null ? order.getShippingFee() : 0.0;

                    if ("COD".equals(order.getPaymentMethod())) {
                        String settlementUrl = userServiceUrl + "/api/v1/internal/wallets/settlement";
                        Map<String, Object> request = Map.of(
                                "orderId", order.getId(),
                                "orderName", "Đơn hàng " + order.getId(),
                                "totalAmount", amount,
                                "commissionFee", commission,
                                "shippingFee", shippingFee,
                                "isDirectAvailable", true,
                                "sellerId", sellerId
                        );
                        restTemplate.postForEntity(settlementUrl, request, Void.class);
                    } else {
                        String releaseUrl = userServiceUrl + "/api/v1/internal/wallets/escrow/release";
                        double sellerAmount = amount - commission - shippingFee;
                        Map<String, Object> request = Map.of(
                                "orderId", order.getId(),
                                "orderName", "Đơn hàng " + order.getId(),
                                "sellerId", sellerId,
                                "amount", sellerAmount
                        );
                        restTemplate.postForEntity(releaseUrl, request, Void.class);
                    }
                    log.info("Auto-completed order {} and released escrow", order.getId());
                }
            } catch (Exception e) {
                log.error("Lỗi khi tự động hoàn tất đơn hàng {}: {}", order.getId(), e.getMessage());
            }
        }
    }

    /**
     * 2. Hạn 6 ngày: Khách không gửi hàng trả (từ lúc WAITING_FOR_RETURN) -> Bác bỏ khiếu nại & Nhả tiền
     */
    @Scheduled(cron = "0 0 * * * *")
    public void autoCancelUnshippedReturns() {
        log.info("CronJob: Bắt đầu kiểm tra các khiếu nại quá hạn gửi hàng (6 ngày)");
        LocalDateTime threshold = LocalDateTime.now().minusDays(6);
        List<RefundRequest> requests = refundRequestRepository.findByStatusAndUpdatedAtBefore("WAITING_FOR_RETURN", threshold);

        for (RefundRequest req : requests) {
            try {
                // Tái sử dụng hàm rejectRefund đã viết sẵn trong OrderService
                orderService.rejectRefund(req.getOrderId(), "Hệ thống tự động bác bỏ: Quá hạn 6 ngày khách không gửi hàng");
                log.info("Auto-rejected refund request for order {}", req.getOrderId());
            } catch (Exception e) {
                log.error("Lỗi khi tự động bác bỏ khiếu nại đơn {}: {}", req.getOrderId(), e.getMessage());
            }
        }
    }

    /**
     * 3. Hạn 2 ngày: Shop ngâm không xác nhận đã nhận hàng hoàn (từ lúc RETURN_RECEIVED) -> Chấp nhận khiếu nại & Hoàn tiền
     */
    @Scheduled(cron = "0 0 * * * *")
    public void autoApproveIgnoredReturns() {
        log.info("CronJob: Bắt đầu kiểm tra các khiếu nại Shop không phản hồi (2 ngày)");
        LocalDateTime threshold = LocalDateTime.now().minusDays(2);
        List<RefundRequest> requests = refundRequestRepository.findByStatusAndUpdatedAtBefore("RETURN_RECEIVED", threshold);

        for (RefundRequest req : requests) {
            try {
                // Tái sử dụng hàm approveRefund đã viết sẵn trong OrderService
                orderService.approveRefund(req.getOrderId(), "Hệ thống tự động chấp nhận: Quá hạn 2 ngày Shop không xác nhận hàng hoàn");
                log.info("Auto-approved refund request for order {}", req.getOrderId());
            } catch (Exception e) {
                log.error("Lỗi khi tự động chấp nhận khiếu nại đơn {}: {}", req.getOrderId(), e.getMessage());
            }
        }
    }
}
