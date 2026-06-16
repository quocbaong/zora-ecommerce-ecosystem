package com.ecommerce.payment_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
import vn.payos.PayOS;
import vn.payos.core.ClientOptions;

@Configuration
public class AppConfig {

    @Value("${payos.client-id:}")
    private String clientId;

    @Value("${payos.api-key:}")
    private String apiKey;

    @Value("${payos.checksum-key:}")
    private String checksumKey;

    @Bean
    public RestTemplate restTemplate() {
        RestTemplate restTemplate = new RestTemplate();
        // Cần thiết để hỗ trợ PATCH
        restTemplate.setRequestFactory(new HttpComponentsClientHttpRequestFactory());
        return restTemplate;
    }

    @Bean
    public PayOS payOS() {
        if (clientId == null || clientId.trim().isEmpty() || 
            apiKey == null || apiKey.trim().isEmpty() || 
            checksumKey == null || checksumKey.trim().isEmpty()) {
            return new PayOS(ClientOptions.builder()
                .clientId("DUMMY")
                .apiKey("DUMMY")
                .checksumKey("DUMMY")
                .build());
        }
        ClientOptions options = ClientOptions.builder()
            .clientId(clientId)
            .apiKey(apiKey)
            .checksumKey(checksumKey)
            .build();
        return new PayOS(options);
    }
}
