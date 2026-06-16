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
public class OrderServiceClient {

    private final RestTemplate restTemplate;

    @Value("${services.order-url}")
    private String orderUrl;

    public Map<String, Object> getMyOrders(String userId) {
        return get("/orders/my?page=0&size=5", userId);
    }

    public Map<String, Object> getOrderDetail(String orderId, String userId) {
        return get("/orders/" + orderId, userId);
    }

    public Map<String, Object> getSellerStats(String sellerId) {
        return get("/orders/seller/stats", sellerId);
    }

    public Map<String, Object> getSellerRevenue(String sellerId, String range) {
        return get("/orders/seller/revenue?range=" + range, sellerId);
    }

    public Map<String, Object> getSellerOrders(String sellerId) {
        return get("/orders/seller?page=0&size=10", sellerId);
    }

    public Map<String, Object> getSellerTopProducts(String sellerId) {
        return get("/orders/seller/top-products?limit=5", sellerId);
    }

    public Map<String, Object> updateOrderStatus(String orderId, String status, String sellerId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Id", sellerId);
            // using exchange instead of patchForObject because patchForObject sometimes isn't supported by default factory
            ResponseEntity<Map> response = restTemplate.exchange(
                    orderUrl + "/orders/" + orderId + "/status?status=" + status,
                    HttpMethod.PATCH,
                    new HttpEntity<>(null, headers),
                    Map.class);
            return response.getBody() != null ? response.getBody() : Map.of("success", true);
        } catch (Exception e) {
            log.warn("[AI_CHAT] order status update failed: {}", e.getMessage());
            return Map.of("error", "Không thể cập nhật trạng thái đơn hàng: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> get(String path, String userId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-User-Id", userId);
            ResponseEntity<Map> response = restTemplate.exchange(
                    orderUrl + path, HttpMethod.GET, new HttpEntity<>(null, headers), Map.class);
            return response.getBody() != null ? response.getBody() : Map.of();
        } catch (Exception e) {
            log.warn("[AI_CHAT] order-service call failed {}: {}", path, e.getMessage());
            return Map.of("error", "Không thể lấy dữ liệu từ order-service");
        }
    }
}
