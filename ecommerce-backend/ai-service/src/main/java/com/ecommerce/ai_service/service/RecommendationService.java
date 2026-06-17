package com.ecommerce.ai_service.service;

import com.ecommerce.ai_service.client.ProductServiceClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationService {

    private final VectorStore vectorStore;
    private final ProductServiceClient productServiceClient;

    /**
     * Lấy các sản phẩm gợi ý dựa trên AI Embedding Cosine Similarity
     */
    public List<String> getRecommendationsForProduct(String productId, int limit) {
        log.info("Fetching AI recommendations for product ID: {}", productId);
        
        // 1. Fetch the product details to get its content
        Map<String, Object> productDetails = productServiceClient.getProductDetail(productId);
        if (productDetails.containsKey("error")) {
            log.warn("Cannot find product {}. Returning empty recommendations.", productId);
            return List.of();
        }

        String name = (String) productDetails.getOrDefault("name", "");
        String description = (String) productDetails.getOrDefault("description", "");
        String categoryName = (String) productDetails.getOrDefault("categoryName", "");
        
        // The text used to search similar vectors
        String searchQuery = String.format("Sản phẩm: %s. Thể loại: %s. Mô tả: %s", name, categoryName, description);

        // 2. Perform Cosine Similarity Search in pgvector
        // We request a larger pool (20) to ensure we have enough products after filtering out RAG documents
        List<Document> similarDocuments = vectorStore.similaritySearch(
                SearchRequest.builder().query(searchQuery).topK(20).build()
        );

        // 3. Extract IDs and filter out the original product and non-product documents
        return similarDocuments.stream()
                .filter(doc -> doc.getMetadata().containsKey("productId"))
                .map(Document::getId)
                .filter(id -> !id.equals(productId))
                .limit(limit)
                .collect(Collectors.toList());
    }

    /**
     * Đồng bộ lại toàn bộ sản phẩm cũ vào AI Vector Store (Backfill)
     * Vì ai-service không truy cập được trực tiếp product_db, ta gọi API lấy danh sách.
     */
    public void syncAllProductsToVectorStore() {
        log.info("Starting manual sync of all products to Vector Store...");
        // Call product search without keywords to get latest products
        // In a real production system, this should use a pagination loop.
        // For demonstration, we fetch a large page size (e.g., 50).
        Map<String, Object> response = productServiceClient.searchProducts("", null, null, null);
        
        if (response.containsKey("content")) {
            List<Map<String, Object>> products = (List<Map<String, Object>>) response.get("content");
            List<Document> documents = products.stream().map(p -> {
                String id = (String) p.get("id");
                String name = (String) p.get("name");
                String description = (String) p.get("description");
                String categoryName = (String) p.get("categoryName");
                Number price = (Number) p.get("price");
                
                String contentToEmbed = String.format("Sản phẩm: %s. Thể loại: %s. Mô tả: %s", name, categoryName, description);
                
                return new Document(
                        id,
                        contentToEmbed,
                        Map.of("productId", id, "name", name, "price", price != null ? price.doubleValue() : 0)
                );
            }).collect(Collectors.toList());

            if (!documents.isEmpty()) {
                vectorStore.add(documents);
                log.info("Successfully synced {} products to Vector Store", documents.size());
            }
        } else {
            log.warn("Failed to fetch products for sync: {}", response);
        }
    }
}
