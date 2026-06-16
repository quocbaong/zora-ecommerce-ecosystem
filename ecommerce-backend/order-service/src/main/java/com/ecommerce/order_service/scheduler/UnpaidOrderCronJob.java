package com.ecommerce.order_service.scheduler;

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
public class UnpaidOrderCronJob {

    private final OrderRepository orderRepository;
    private final OrderService orderService;

    // Run every 5 minutes (300000 ms)
    @Scheduled(fixedRate = 300000)
    public void autoCancelUnpaidOrders() {
        log.info("[UnpaidOrderCronJob] Starting to check for unpaid orders...");
        List<Order> pendingOrders = orderRepository.findPendingOnlineOrders();
        int canceledCount = 0;

        for (Order order : pendingOrders) {
            LocalDateTime expireTime = null;

            if ("PAYOS".equalsIgnoreCase(order.getPaymentMethod())) {
                expireTime = order.getCreatedAt().plusHours(12);
            } else if ("STRIPE".equalsIgnoreCase(order.getPaymentMethod()) || "MOMO".equalsIgnoreCase(order.getPaymentMethod()) || "ONLINE".equalsIgnoreCase(order.getPaymentMethod())) {
                expireTime = order.getCreatedAt().plusMinutes(30);
            }

            if (expireTime != null && LocalDateTime.now().isAfter(expireTime)) {
                try {
                    log.info("[UnpaidOrderCronJob] Order {} is overdue. Auto-canceling...", order.getId());
                    orderService.cancelOrder(order.getId(), "SYSTEM");
                    canceledCount++;
                } catch (Exception e) {
                    log.error("[UnpaidOrderCronJob] Failed to cancel order {}: {}", order.getId(), e.getMessage());
                }
            }
        }
        log.info("[UnpaidOrderCronJob] Finished checking unpaid orders. Canceled {} orders.", canceledCount);
    }
}
