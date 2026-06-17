package com.ecommerce.ai_service.kafka.consumer;

import com.ecommerce.ai_service.client.ProductServiceClient;
import com.ecommerce.ai_service.dto.event.ProductCreatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductRecommendationConsumer {

    private final VectorStore vectorStore;
    private final ProductServiceClient productServiceClient;

    @KafkaListener(topics = "product_events", groupId = "ai-recommendation-group")
    public void consumeProductCreatedEvent(ProductCreatedEvent event) {
        log.info("AI Service Kafka Consumer: Received ProductCreatedEvent for Product ID {}", event.getProductId());

        try {
            // Fetch product details from product-service to get full description
            Map<String, Object> productDetails = productServiceClient.getProductDetail(event.getProductId());
            
            if (productDetails.containsKey("error")) {
                log.warn("Could not fetch product details for ID {}: {}", event.getProductId(), productDetails.get("error"));
                return;
            }

            // Extract content to embed
            String name = (String) productDetails.getOrDefault("name", event.getName());
            String description = (String) productDetails.getOrDefault("description", "");
            String categoryName = (String) productDetails.getOrDefault("categoryName", "");
            
            String contentToEmbed = String.format("Sản phẩm: %s. Thể loại: %s. Mô tả: %s", name, categoryName, description);

            // Create Spring AI Document
            Document document = new Document(
                    event.getProductId(), // Document ID = Product ID
                    contentToEmbed,
                    Map.of(
                            "productId", event.getProductId(),
                            "name", name,
                            "price", event.getPrice() != null ? event.getPrice() : 0
                    )
            );

            // Add to pgvector (This will automatically call the Embedding API and save to DB)
            vectorStore.add(List.of(document));
            log.info("AI Service Kafka Consumer: Successfully embedded and saved Product ID {} to pgvector", event.getProductId());
            
        } catch (Exception e) {
            log.error("Error processing ProductCreatedEvent for ID {}: {}", event.getProductId(), e.getMessage());
        }
    }
}
