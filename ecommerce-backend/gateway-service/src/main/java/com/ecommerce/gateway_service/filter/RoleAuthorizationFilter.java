package com.ecommerce.gateway_service.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
public class RoleAuthorizationFilter implements GlobalFilter, Ordered {

    private static final Logger logger = LoggerFactory.getLogger(RoleAuthorizationFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();
        String method = request.getMethod().name();
        boolean isProductReviewWrite = path.matches("/api/products/[^/]+/reviews") && method.equals("POST");
        boolean isCategoryAttributeWrite = path.matches("/api/products/categories/[^/]+/attributes(/[^/]+)?")
                && (method.equals("POST") || method.equals("PUT") || method.equals("DELETE"));

        // Gateway Authentication Filter already injected the role if authenticated
        String role = request.getHeaders().getFirst("X-Role");

        // Chỉ ADMIN được cấu hình schema attribute của danh mục
        if (isCategoryAttributeWrite) {
            if (!"ADMIN".equals(role)) {
                logger.warn("User with role {} is forbidden from {} {}", role, method, path);
                throw new RuntimeException("FORBIDDEN");
            }
            return chain.filter(exchange);
        }

        // Only SELLER and ADMIN can create/update/delete products
        if (path.startsWith("/api/products") && (method.equals("POST") || method.equals("PUT") || method.equals("DELETE"))) {
            if (isProductReviewWrite) {
                return chain.filter(exchange);
            }
            // GET /api/products/categories is public, but POST/PUT/DELETE require SELLER or ADMIN
            if (role == null || (!role.equals("SELLER") && !role.equals("ADMIN"))) {
                logger.warn("User with role {} is forbidden from {} {}", role, method, path);
                throw new RuntimeException("FORBIDDEN");
            }
        }

        // Only ADMIN can view all orders (statistics)
        if (path.equals("/api/orders") && method.equals("GET")) {
            if (!"ADMIN".equals(role)) {
                logger.warn("User with role {} is forbidden from GET /api/orders", role);
                throw new RuntimeException("FORBIDDEN");
            }
        }

        // Only SELLER and ADMIN can update order status
        if (path.matches("/api/orders/[^/]+/status") && method.equals("PATCH")) {
            if (role == null || (!role.equals("SELLER") && !role.equals("ADMIN"))) {
                logger.warn("User with role {} is forbidden from PATCH order status", role);
                throw new RuntimeException("FORBIDDEN");
            }
        }

        // Only ADMIN can access admin endpoints across all services
        if (path.startsWith("/api/users/admin/") || path.startsWith("/api/orders/admin/") || path.startsWith("/api/products/admin/")) {
            if (!"ADMIN".equals(role)) {
                logger.warn("User with role {} is forbidden from admin endpoint {} {}", role, method, path);
                throw new RuntimeException("FORBIDDEN");
            }
        }

        // Ad campaigns: SELLER tạo/quản lý của mình, ADMIN duyệt
        if (path.startsWith("/api/ads/campaigns")) {
            // /api/ads/campaigns/active là public — không check role
            if (path.equals("/api/ads/campaigns/active")) {
                return chain.filter(exchange);
            }
            boolean adminOnly = path.matches("/api/ads/campaigns/[^/]+/(approve|reject|force-stop)")
                    || (path.equals("/api/ads/campaigns") && method.equals("GET"));
            if (adminOnly) {
                if (!"ADMIN".equals(role)) {
                    logger.warn("User role {} forbidden from {} {}", role, method, path);
                    throw new RuntimeException("FORBIDDEN");
                }
            } else {
                // POST tạo, GET /mine, DELETE /{id}, POST /upload-banner → SELLER hoặc ADMIN
                if (role == null || (!role.equals("SELLER") && !role.equals("ADMIN"))) {
                    logger.warn("User role {} forbidden from {} {}", role, method, path);
                    throw new RuntimeException("FORBIDDEN");
                }
            }
        }

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return 0; // Execute after JwtAuthenticationFilter (-1)
    }
}
