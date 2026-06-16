package com.ecommerce.product.kafka.producer;

import com.ecommerce.product.kafka.event.ProductCreatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    private static final String PRODUCT_TOPIC = "product_events";

    public void sendProductCreatedEvent(ProductCreatedEvent event) {
        log.info("Đang báo tin Sản phẩm mới lên Kafka: {}", event.getProductId());

        Message<ProductCreatedEvent> message = MessageBuilder
                .withPayload(event)
                .setHeader(KafkaHeaders.TOPIC, PRODUCT_TOPIC)
                .build();

        kafkaTemplate.send(message);

        log.info("Tin nhắn đã được gửi lên hệ thống Kafka!");
    }
}
