package com.ecommerce.order_service.component;

import com.ecommerce.order_service.entity.OutboxEvent;
import com.ecommerce.order_service.kafka.event.OrderCreatedEvent;
import com.ecommerce.order_service.kafka.event.OrderStatusChangedEvent;
import com.ecommerce.order_service.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventPublisher {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    /**
     * Saves an outbox event in the same DB transaction as the order.
     * The OutboxWorker will pick it up and publish to Kafka after commit.
     */
    public void scheduleOrderCreated(String orderId, String userId, String sellerId, Double totalPrice) {
        try {
            OrderCreatedEvent event = OrderCreatedEvent.builder()
                    .orderId(orderId)
                    .userId(userId)
                    .sellerId(sellerId)
                    .totalPrice(totalPrice)
                    .build();
            OutboxEvent outbox = OutboxEvent.builder()
                    .aggregateId(orderId)
                    .eventType("order_created")
                    .payload(objectMapper.writeValueAsString(event))
                    .build();
            outboxEventRepository.save(outbox);
        } catch (Exception e) {
            log.error("Failed to schedule outbox event for order {}: {}", orderId, e.getMessage());
        }
    }

    public void scheduleOrderStatusChanged(String orderId, String userId, String sellerId, String status, String note) {
        try {
            OrderStatusChangedEvent event = OrderStatusChangedEvent.builder()
                    .orderId(orderId)
                    .userId(userId)
                    .sellerId(sellerId)
                    .status(status)
                    .note(note)
                    .build();
            OutboxEvent outbox = OutboxEvent.builder()
                    .aggregateId(orderId)
                    .eventType("order_update")
                    .payload(objectMapper.writeValueAsString(event))
                    .build();
            outboxEventRepository.save(outbox);
        } catch (Exception e) {
            log.error("Failed to schedule status-change outbox event for order {}: {}", orderId, e.getMessage());
        }
    }
}
