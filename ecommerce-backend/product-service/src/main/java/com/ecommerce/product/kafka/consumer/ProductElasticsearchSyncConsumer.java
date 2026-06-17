package com.ecommerce.product.kafka.consumer;

import com.ecommerce.product.document.ProductDocument;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.kafka.event.ProductCreatedEvent;
import com.ecommerce.product.repository.ProductElasticsearchRepository;
import com.ecommerce.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductElasticsearchSyncConsumer {

    private final ProductRepository productRepository;
    private final ProductElasticsearchRepository productElasticsearchRepository;

    @KafkaListener(topics = "product_events", groupId = "product-elasticsearch-sync-group")
    public void consumeProductCreatedEvent(ProductCreatedEvent event) {
        log.info("Kafka Consumer: Received ProductCreatedEvent for Product ID {}", event.getProductId());

        Optional<Product> productOpt = productRepository.findById(event.getProductId());
        
        if (productOpt.isPresent()) {
            Product product = productOpt.get();
            
            ProductDocument document = ProductDocument.builder()
                    .id(product.getId())
                    .name(product.getName())
                    .description(product.getDescription())
                    .price(product.getPrice())
                    .sellerId(product.getSellerId())
                    .status(product.getStatus().name())
                    .ratingAvg(product.getRatingAvg())
                    .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                    .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                    .build();
                    
            productElasticsearchRepository.save(document);
            log.info("Kafka Consumer: Successfully synced Product ID {} to Elasticsearch", event.getProductId());
        } else {
            log.warn("Kafka Consumer: Product ID {} not found in PostgreSQL. Skipping ES sync.", event.getProductId());
        }
    }
}
