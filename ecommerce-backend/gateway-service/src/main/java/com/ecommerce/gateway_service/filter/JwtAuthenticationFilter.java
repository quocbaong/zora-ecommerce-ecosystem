package com.ecommerce.gateway_service.filter;

import com.ecommerce.gateway_service.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ReactiveStringRedisTemplate reactiveRedisTemplate;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        String method = request.getMethod().name();

        boolean isAuth = path.startsWith("/api/auth");
        boolean isPublicProduct = path.startsWith("/api/products") && method.equals("GET")
                && !path.startsWith("/api/products/admin");
        boolean isWebsocket = path.startsWith("/socket.io") || path.startsWith("/ws");
        boolean isHealthCheck = path.equals("/api/ai/health");
        boolean isWebhook = path.startsWith("/api/payments/webhook");
        boolean isPublicUserSearch = path.equals("/api/users/sellers/search") && method.equals("GET");
        boolean isPublicShop = path.startsWith("/api/users/shops/") && method.equals("GET");
        boolean isPublicVoucherShop = path.startsWith("/api/orders/vouchers/shop/") && method.equals("GET");
        boolean isPublicShipping = path.startsWith("/api/shipping/");
        boolean isPublicAds = path.equals("/api/ads/campaigns/active");
        boolean isPublicAppeals = path.startsWith("/api/users/appeals/public");
        boolean isPublicPaymentCreate = path.startsWith("/api/payments/create");
        boolean isPublic = isAuth || isPublicProduct || isWebsocket || isHealthCheck || isWebhook
                || isPublicUserSearch || isPublicShop || isPublicVoucherShop || isPublicShipping || isPublicAds || isPublicAppeals || isPublicPaymentCreate;

        String authHeader = request.getHeaders().getFirst("Authorization");

        // Public endpoint with no Authorization → pass through anonymously
        if (isPublic && (authHeader == null || !authHeader.startsWith("Bearer "))) {
            return chain.filter(exchange);
        }

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("UNAUTHORIZED");
        }

        String token = authHeader.substring(7);

        if (!jwtUtil.validateToken(token)) {
            // For public endpoints, an invalid token shouldn't block access — just skip injection
            if (isPublic) {
                return chain.filter(exchange);
            }
            throw new RuntimeException("INVALID_TOKEN");
        }

        String userId = jwtUtil.extractUserId(token);
        String role = jwtUtil.extractRole(token);
        String email = jwtUtil.extractEmail(token);

        // Check Redis for banned user — non-blocking reactive check
        return reactiveRedisTemplate.hasKey("banned:" + userId)
                .flatMap(isBanned -> {
                    if (Boolean.TRUE.equals(isBanned)) {
                        ServerHttpResponse response = exchange.getResponse();
                        response.setStatusCode(HttpStatus.UNAUTHORIZED);
                        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
                        byte[] bytes = "{\"code\":\"ACCOUNT_BANNED\",\"message\":\"Tài khoản đã bị khóa bởi quản trị viên\"}"
                                .getBytes(StandardCharsets.UTF_8);
                        DataBuffer buffer = response.bufferFactory().wrap(bytes);
                        return response.writeWith(Mono.just(buffer));
                    }

                    ServerHttpRequest.Builder mutatedBuilder = exchange.getRequest()
                            .mutate()
                            .header("X-User-Id", userId)
                            .header("X-Role", role);
                    if (email != null && !email.isBlank()) {
                        mutatedBuilder.header("X-User-Email", email);
                    }
                    return chain.filter(exchange.mutate().request(mutatedBuilder.build()).build());
                });
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
