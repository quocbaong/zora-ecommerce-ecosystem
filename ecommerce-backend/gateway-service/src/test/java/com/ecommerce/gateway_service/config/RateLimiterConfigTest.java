package com.ecommerce.gateway_service.config;

import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;

import java.net.InetSocketAddress;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RateLimiterConfigTest {

    private final KeyResolver resolver = new RateLimiterConfig().ipKeyResolver();

    @Test
    void usesFirstIpFromXForwardedFor() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/")
                .header("X-Forwarded-For", "1.2.3.4, 10.0.0.1")
                .build();

        String key = resolver.resolve(MockServerWebExchange.from(request)).block();

        assertEquals("1.2.3.4", key);
    }

    @Test
    void fallsBackToRemoteAddressWhenNoHeader() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/")
                .remoteAddress(new InetSocketAddress("8.8.8.8", 12345))
                .build();

        String key = resolver.resolve(MockServerWebExchange.from(request)).block();

        assertEquals("8.8.8.8", key);
    }
}
