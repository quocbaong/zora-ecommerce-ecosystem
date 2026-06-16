package com.ecommerce.order_service.component;

import com.ecommerce.order_service.entity.OutboxEvent;
import com.ecommerce.order_service.kafka.event.OrderCreatedEvent;
import com.ecommerce.order_service.kafka.event.OrderStatusChangedEvent;
import com.ecommerce.order_service.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxWorker {

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    private static final int MAX_RETRIES = 5;

    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> pending = outboxEventRepository
                .findTop100ByStatusOrderByCreatedAtAsc("PENDING");

        for (OutboxEvent event : pending) {
            try {
                Object payload = resolvePayload(event);
                kafkaTemplate.send(event.getEventType(), payload)
                        .get(5, TimeUnit.SECONDS);
                event.setStatus("SENT");
                log.info("Outbox event sent: {} aggregateId={}", event.getEventType(), event.getAggregateId());
            } catch (Exception e) {
                int retries = event.getRetryCount() + 1;
                event.setRetryCount(retries);
                if (retries >= MAX_RETRIES) {
                    event.setStatus("FAILED");
                    log.error("Outbox event FAILED after {} retries id={}: {}",
                            MAX_RETRIES, event.getId(), e.getMessage());
                } else {
                    log.warn("Outbox event retry {}/{} id={}: {}",
                            retries, MAX_RETRIES, event.getId(), e.getMessage());
                }
            }
            outboxEventRepository.save(event);
        }
    }

    private Object resolvePayload(OutboxEvent event) throws Exception {
        return switch (event.getEventType()) {
            case "order_created" -> objectMapper.readValue(event.getPayload(), OrderCreatedEvent.class);
            case "order_update" -> objectMapper.readValue(event.getPayload(), OrderStatusChangedEvent.class);
            default -> objectMapper.readValue(event.getPayload(), Object.class);
        };
    }
}
