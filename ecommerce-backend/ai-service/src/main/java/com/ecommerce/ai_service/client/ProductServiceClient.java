package com.ecommerce.ai_service.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProductServiceClient {

    private final RestTemplate restTemplate;

    @Value("${services.product-url}")
    private String productUrl;

    @SuppressWarnings("unchecked")
    public Map<String, Object> searchProducts(String keyword, String categoryId,
                                               Double minPrice, Double maxPrice) {
        try {
            StringBuilder uri = new StringBuilder("/products?size=5&keyword=")
                    .append(java.net.URLEncoder.encode(keyword, java.nio.charset.StandardCharsets.UTF_8));
            if (categoryId != null) uri.append("&categoryId=").append(categoryId);
            if (minPrice != null)   uri.append("&minPrice=").append(minPrice);
            if (maxPrice != null)   uri.append("&maxPrice=").append(maxPrice);

            ResponseEntity<Map> response = restTemplate.getForEntity(productUrl + uri, Map.class);
            return response.getBody() != null ? response.getBody() : Map.of();
        } catch (Exception e) {
            log.warn("[AI_CHAT] product search failed: {}", e.getMessage());
            return Map.of("error", "Không thể tìm kiếm sản phẩm");
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getProductDetail(String productId) {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                    productUrl + "/products/" + productId, Map.class);
            return response.getBody() != null ? response.getBody() : Map.of();
        } catch (Exception e) {
            log.warn("[AI_CHAT] product detail failed {}: {}", productId, e.getMessage());
            return Map.of("error", "Không tìm thấy sản phẩm");
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> updateProduct(String productId, Map<String, Object> updates, String sellerId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Id", sellerId);
            headers.setContentType(MediaType.APPLICATION_JSON);
            ResponseEntity<Map> response = restTemplate.exchange(
                    productUrl + "/products/" + productId,
                    HttpMethod.PUT,
                    new HttpEntity<>(updates, headers),
                    Map.class);
            return response.getBody() != null ? response.getBody() : Map.of("success", true);
        } catch (Exception e) {
            log.warn("[AI_CHAT] product update failed: {}", e.getMessage());
            return Map.of("error", "Không thể cập nhật sản phẩm: " + e.getMessage());
        }
    }

    public Map<String, Object> disableProduct(String productId, String sellerId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Id", sellerId);
            ResponseEntity<String> response = restTemplate.exchange(
                    productUrl + "/products/" + productId,
                    HttpMethod.DELETE,
                    new HttpEntity<>(null, headers),
                    String.class);
            return Map.of("success", true, "message", response.getBody() != null ? response.getBody() : "Đã tạm ngưng bán sản phẩm");
        } catch (Exception e) {
            log.warn("[AI_CHAT] product disable failed: {}", e.getMessage());
            return Map.of("error", "Không thể ngưng bán sản phẩm: " + e.getMessage());
        }
    }
}
