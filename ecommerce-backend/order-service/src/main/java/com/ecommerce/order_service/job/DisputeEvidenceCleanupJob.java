package com.ecommerce.order_service.job;

import com.ecommerce.order_service.entity.Order;
import com.ecommerce.order_service.repository.OrderRepository;
import com.ecommerce.order_service.service.S3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DisputeEvidenceCleanupJob {

    private final OrderRepository orderRepository;
    private final S3Service s3Service;

    // Run on the 1st day of every month at 2:00 AM
    @Scheduled(cron = "0 0 2 1 * ?")
    public void cleanupOldDisputeEvidences() {
        log.info("Starting dispute evidence cleanup job...");
        // LocalDateTime threshold = LocalDateTime.now().minusMonths(3);

        // List<Order> oldOrders = orderRepository.findOldOrdersWithEvidences(threshold);

        // if (oldOrders.isEmpty()) {
        //     log.info("No old orders found for evidence cleanup.");
        //     return;
        // }

        // int deletedCount = 0;
        // for (Order order : oldOrders) {
        //     try {
        //         if (order.getDisputeEvidenceUrls() != null) {
        //             for (String url : order.getDisputeEvidenceUrls()) {
        //                 s3Service.deleteFile(url);
        //                 deletedCount++;
        //             }
        //             order.setDisputeEvidenceUrls(null);
        //             orderRepository.save(order);
        //         }
        //     } catch (Exception e) {
        //         log.error("Failed to cleanup evidence for order {}", order.getId(), e);
        //     }
        // }

        // log.info("Dispute evidence cleanup job completed. Deleted {} files from S3.", deletedCount);
    }
}
