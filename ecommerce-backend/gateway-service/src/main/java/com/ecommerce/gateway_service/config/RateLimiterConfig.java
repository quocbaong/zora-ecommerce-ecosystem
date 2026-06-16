package com.ecommerce.gateway_service.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

@Configuration
public class RateLimiterConfig {

    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> {
            // Sau reverse proxy (Caddy), IP thật của client nằm ở X-Forwarded-For;
            // getRemoteAddress() chỉ là IP của proxy → mọi user sẽ chung 1 bucket nếu dùng nó.
            String xff = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                return Mono.just(xff.split(",")[0].trim());
            }
            var remote = exchange.getRequest().getRemoteAddress();
            return Mono.just(remote != null ? remote.getAddress().getHostAddress() : "unknown");
        };
    }
}
