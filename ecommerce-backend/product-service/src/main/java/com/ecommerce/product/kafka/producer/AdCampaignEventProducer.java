package com.ecommerce.product.kafka.producer;

import com.ecommerce.product.kafka.event.AdCampaignDecidedEvent;
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
public class AdCampaignEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    private static final String TOPIC = "ad_campaign_decided";

    public void sendDecided(AdCampaignDecidedEvent event) {
        log.info("Publish ad_campaign_decided: {} → {}", event.getCampaignId(), event.getStatus());
        Message<AdCampaignDecidedEvent> message = MessageBuilder
                .withPayload(event)
                .setHeader(KafkaHeaders.TOPIC, TOPIC)
                .build();
        kafkaTemplate.send(message);
    }
}
