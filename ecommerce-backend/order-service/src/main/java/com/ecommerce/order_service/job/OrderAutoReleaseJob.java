package com.ecommerce.order_service.job;

import com.ecommerce.order_service.entity.Order;
import com.ecommerce.order_service.repository.OrderRepository;
import com.ecommerce.order_service.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderAutoReleaseJob {

    private final OrderRepository orderRepository;
    private final OrderService orderService;

    /**
     * Chạy vào lúc 2h sáng mỗi ngày
     * Quét các đơn hàng ở trạng thái SHIPPING đã quá 3 ngày
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void autoConfirmDeliveredOrders() {
        log.info("Bắt đầu chạy tiến trình Auto Release (Tự động hoàn thành đơn hàng)...");

        // Tìm các đơn hàng đã ở trạng thái SHIPPING quá 3 ngày
        LocalDateTime thresholdDate = LocalDateTime.now().minusDays(3);
        List<Order> overdueOrders = orderRepository.findOverdueShippedOrders(thresholdDate);

        if (overdueOrders.isEmpty()) {
            log.info("Không có đơn hàng nào cần Auto Release hôm nay.");
            return;
        }

        log.info("Tìm thấy {} đơn hàng quá hạn cần Auto Release.", overdueOrders.size());

        int successCount = 0;
        for (Order order : overdueOrders) {
            try {
                // Đóng giả làm người mua (buyer) để gọi hàm confirmDelivery
                orderService.confirmDelivery(order.getId(), order.getUserId());
                successCount++;
                log.info("Đã Auto Release thành công đơn hàng: {}", order.getId());
            } catch (Exception e) {
                log.error("Lỗi khi Auto Release đơn hàng: {}. Bỏ qua và chạy đơn tiếp theo. Chi tiết lỗi: {}", order.getId(), e.getMessage());
            }
        }

        log.info("Hoàn tất Auto Release. Thành công: {} / {} đơn hàng.", successCount, overdueOrders.size());
    }
}
