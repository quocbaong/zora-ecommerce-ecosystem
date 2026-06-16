package com.ecommerce.notification_service.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class UserClient {

    private final RestTemplate restTemplate;

    @Value("${services.user-url:http://user-service:8082}")
    private String userServiceUrl;

    @Value("${services.auth-url:http://auth-service:8081}")
    private String authServiceUrl;

    public UserInfo getById(String userId) {
        String email = null;
        String fullName = null;

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = restTemplate.getForObject(
                    userServiceUrl + "/users/" + userId, Map.class);
            if (body != null) {
                email = (String) body.get("email");
                fullName = (String) body.get("fullName");
            }
        } catch (Exception e) {
            log.warn("Không lấy được thông tin user {} từ user-service: {}", userId, e.getMessage());
        }

        // Fallback: lấy email từ auth-service (nguồn email duy nhất)
        if (email == null || email.isBlank()) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> body = restTemplate.getForObject(
                        authServiceUrl + "/auth/internal/user-by-id/" + userId, Map.class);
                if (body != null) {
                    email = (String) body.get("email");
                }
            } catch (Exception e) {
                log.warn("Không lấy được email user {} từ auth-service: {}", userId, e.getMessage());
            }
        }

        if (email == null || email.isBlank()) return null;
        return new UserInfo(email, fullName);
    }

    public record UserInfo(String email, String fullName) {}
}
