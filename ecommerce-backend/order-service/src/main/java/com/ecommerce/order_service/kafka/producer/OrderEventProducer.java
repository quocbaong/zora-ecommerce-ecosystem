package com.ecommerce.order_service.kafka.producer;

import com.ecommerce.order_service.kafka.event.OrderCreatedEvent;
import com.ecommerce.order_service.kafka.event.OrderStatusChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void sendOrderCreatedEvent(OrderCreatedEvent event) {
        log.info("Publishing order_created event for orderId: {}", event.getOrderId());
        kafkaTemplate.send("order_created", event);
    }

    public void sendOrderStatusChangedEvent(OrderStatusChangedEvent event) {
        log.info("Publishing order_update event for orderId: {} status: {}", event.getOrderId(), event.getStatus());
        kafkaTemplate.send("order_update", event);
    }
}
