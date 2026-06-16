package com.ecommerce.order_service.component;

import com.ecommerce.order_service.dto.request.OrderItemRequest;
import com.ecommerce.order_service.dto.request.OrderRequest;
import com.ecommerce.order_service.entity.OrderItem;
import com.ecommerce.order_service.exception.CustomException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderValidator {

    private final RestTemplate restTemplate;

    @Value("${services.product-url}")
    private String productServiceUrl;

    @Retry(name = "productService")
    @CircuitBreaker(name = "productService", fallbackMethod = "validateStockFallback")
    public Map<String, Double> validateStock(OrderRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) return new HashMap<>();

        List<Map<String, Object>> items = request.getItems().stream().map(item -> {
            Map<String, Object> e = new HashMap<>();
            e.put("productId", item.getProductId());
            e.put("variantId", item.getVariantId());
            e.put("quantity", item.getQuantity());
            return e;
        }).toList();

        var response = restTemplate.postForEntity(
                productServiceUrl + "/products/check-stock",
                Map.of("items", items),
                Map.class
        );

        if (response.getBody() != null && !Boolean.TRUE.equals(response.getBody().get("available"))) {
            Object outList = response.getBody().get("outOfStockItems");
            StringBuilder msg = new StringBuilder("Một số sản phẩm không đủ tồn kho:");
            if (outList instanceof List<?> list) {
                for (Object o : list) {
                    if (o instanceof Map<?, ?> m) {
                        msg.append(" [").append(m.get("productName"))
                                .append(" — yêu cầu ").append(m.get("requested"))
                                .append(", còn ").append(m.get("available")).append("]");
                    }
                }
            }
            throw new CustomException(msg.toString(), HttpStatus.BAD_REQUEST);
        }
        Object ratesObj = response.getBody().get("commissionRates");
        Map<String, Double> commissionRates = new HashMap<>();
        if (ratesObj instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (entry.getKey() instanceof String k && entry.getValue() instanceof Number v) {
                    commissionRates.put(k, v.doubleValue());
                }
            }
        }
        return commissionRates;
    }

    public Map<String, Double> validateStockFallback(OrderRequest request, Throwable t) {
        log.warn("product-service không khả dụng cho stock check (circuit open), tiếp tục đặt hàng: {}",
                t.getMessage());
        return new HashMap<>();
    }

    @Retry(name = "productService")
    @CircuitBreaker(name = "productService", fallbackMethod = "decrementStockFallback")
    public void decrementStock(List<OrderItemRequest> items) {
        if (items == null) return;
        for (var item : items) {
            String url = productServiceUrl + "/products/" + item.getProductId()
                    + "/decrement-stock?quantity=" + item.getQuantity()
                    + (item.getVariantId() != null ? "&variantId=" + item.getVariantId() : "");
            restTemplate.postForEntity(url, null, Void.class);
        }
    }

    public void decrementStockFallback(List<OrderItemRequest> items, Throwable t) {
        log.error("Decrement stock thất bại (circuit open), cần reconcile thủ công. Lý do: {}",
                t.getMessage());
    }

    @CircuitBreaker(name = "productService", fallbackMethod = "incrementStockFallback")
    public void incrementStock(List<OrderItem> items) {
        if (items == null) return;
        for (var item : items) {
            String url = productServiceUrl + "/products/" + item.getProductId()
                    + "/increment-stock?quantity=" + item.getQuantity()
                    + (item.getVariantId() != null ? "&variantId=" + item.getVariantId() : "");
            restTemplate.postForEntity(url, null, Void.class);
        }
    }

    public void incrementStockFallback(List<OrderItem> items, Throwable t) {
        log.error("Increment stock thất bại (circuit open) khi hủy đơn, cần reconcile thủ công. Lý do: {}",
                t.getMessage());
    }
}
