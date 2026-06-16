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
public class CartServiceClient {

    private final RestTemplate restTemplate;

    @Value("${services.cart-url}")
    private String cartUrl;

    @SuppressWarnings("unchecked")
    public Map<String, Object> getCart(String userId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Id", userId);
            ResponseEntity<Map> response = restTemplate.exchange(
                    cartUrl + "/cart", HttpMethod.GET, new HttpEntity<>(null, headers), Map.class);
            return response.getBody() != null ? response.getBody() : Map.of();
        } catch (Exception e) {
            log.warn("[AI_CHAT] cart-service call failed: {}", e.getMessage());
            return Map.of("error", "Không thể lấy thông tin giỏ hàng");
        }
    }
}
