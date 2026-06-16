package com.ecommerce.order_service.component;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
@Slf4j
public class CartClient {

    private final RestTemplate restTemplate;

    @Value("${services.cart-url}")
    private String cartServiceUrl;

    @Retry(name = "cartService")
    @CircuitBreaker(name = "cartService", fallbackMethod = "clearCartFallback")
    public void clearCart(String userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", userId);
        restTemplate.exchange(
                cartServiceUrl + "/cart",
                HttpMethod.DELETE,
                new HttpEntity<>(null, headers),
                Void.class
        );
        log.info("Cart cleared for userId: {}", userId);
    }

    public void clearCartFallback(String userId, Throwable t) {
        log.warn("Không thể xóa giỏ hàng cho userId {} (circuit open): {}", userId, t.getMessage());
    }
}
