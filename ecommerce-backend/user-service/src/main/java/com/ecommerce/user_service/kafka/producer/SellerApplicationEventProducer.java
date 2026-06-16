package com.ecommerce.user_service.kafka.producer;

import com.ecommerce.user_service.kafka.event.SellerApplicationDecidedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SellerApplicationEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void sendDecidedEvent(SellerApplicationDecidedEvent event) {
        log.info("[KAFKA] Publishing seller_application_decided for userId={} status={}", event.getUserId(), event.getStatus());
        kafkaTemplate.send("seller_application_decided", event);
    }
}
