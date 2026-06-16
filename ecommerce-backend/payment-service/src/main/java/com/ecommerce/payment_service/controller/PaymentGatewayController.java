package com.ecommerce.payment_service.controller;

import com.ecommerce.payment_service.dto.PaymentRequest;
import com.ecommerce.payment_service.dto.PaymentResponse;
import com.ecommerce.payment_service.strategy.PaymentStrategy;
import com.ecommerce.payment_service.strategy.PaymentStrategyFactory;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentGatewayController {

    private final PaymentStrategyFactory strategyFactory;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final vn.payos.PayOS payOS;
    
    @Value("${services.order-url}")
    private String orderServiceUrl;

    @Value("${services.user-url:http://user-service:8080}")
    private String userServiceUrl;

    @PostMapping("/create")
    public ResponseEntity<PaymentResponse> createPayment(@RequestBody PaymentRequest request, @RequestParam String method) {
        try {
            PaymentStrategy strategy = strategyFactory.getStrategy(method);
            PaymentResponse response = strategy.createPayment(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Create payment failed", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/momo-confirm")
    public ResponseEntity<Void> confirmMomoPayment(@RequestBody Map<String, Object> data) {
        try {
            log.info("Received MoMo manual confirmation: {}", data);
            String orderId = (String) data.get("orderId");
            String actualOrderId = orderId.split("_")[0];
            
            String updateUrl;
            if (actualOrderId.startsWith("APPEAL_")) {
                String appealId = actualOrderId.substring("APPEAL_".length());
                updateUrl = userServiceUrl + "/api/users/appeals/internal/" + appealId + "/payment-success";
            } else {
                updateUrl = orderServiceUrl + "/api/v1/internal/orders/" + actualOrderId + "/payment-success";
            }
            
            Map<String, Object> callbackData = new java.util.HashMap<>();
            callbackData.put("provider", "MOMO");
            callbackData.put("providerTransactionId", "MOCK_TXN_" + System.currentTimeMillis());
            callbackData.put("rawResponse", "Manual confirmation via frontend redirect");
            
            restTemplate.postForEntity(updateUrl, callbackData, Void.class);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Manual MoMo confirmation failed", e);
            return ResponseEntity.badRequest().build();
        }
    }

    // Webhooks IPN
    @PostMapping("/webhook/momo")
    public ResponseEntity<Void> handleMomoWebhook(@RequestBody String payload) {
        try {
            Map<String, Object> data = objectMapper.readValue(payload, Map.class);
            String signature = (String) data.get("signature");
            
            log.info("Received MoMo Webhook: {}", payload);
            
            // 1. Xác thực chữ ký
            strategyFactory.getStrategy("MOMO").verifyWebhook(payload, signature);
            
            // 2. Trích xuất OrderId gốc (bỏ đi phần timestamp đã nối)
            String momoOrderId = (String) data.get("orderId");
            String actualOrderId = momoOrderId.split("_")[0];
            
            // 3. Gọi Order Service hoặc User Service để cập nhật trạng thái PAID
            String updateUrl;
            if (actualOrderId.startsWith("APPEAL_")) {
                String appealId = actualOrderId.substring("APPEAL_".length());
                updateUrl = userServiceUrl + "/api/users/appeals/internal/" + appealId + "/payment-success";
            } else {
                updateUrl = orderServiceUrl + "/api/v1/internal/orders/" + actualOrderId + "/payment-success";
            }
            
            data.put("provider", "MOMO");
            data.put("providerTransactionId", String.valueOf(data.get("transId")));
            data.put("rawResponse", payload);
            
            restTemplate.postForEntity(updateUrl, data, Void.class);
            
            // 4. Trả về 204 No Content cho MoMo để báo hiệu nhận thành công (MoMo IPN yêu cầu HTTP Status 204)
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("MoMo Webhook failed", e);
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping("/payos-confirm")
    public ResponseEntity<Void> confirmPayOSPayment(@RequestBody Map<String, Object> data) {
        try {
            log.info("Received PayOS manual confirmation: {}", data);
            String orderId = (String) data.get("orderId");
            
            String updateUrl;
            if (orderId.startsWith("APPEAL_")) {
                String appealId = orderId.substring("APPEAL_".length());
                updateUrl = userServiceUrl + "/api/users/appeals/internal/" + appealId + "/payment-success";
            } else {
                updateUrl = orderServiceUrl + "/api/v1/internal/orders/" + orderId + "/payment-success";
            }
            
            Map<String, Object> callbackData = new java.util.HashMap<>();
            callbackData.put("provider", "PAYOS");
            callbackData.put("providerTransactionId", "MOCK_PAYOS_" + System.currentTimeMillis());
            callbackData.put("rawResponse", "Manual confirmation via frontend redirect");
            
            restTemplate.postForEntity(updateUrl, callbackData, Void.class);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Manual PayOS confirmation failed", e);
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping("/webhook/payos")
    public ResponseEntity<Void> handlePayOSWebhook(@RequestBody Object body) {
        try {
            log.info("Received PayOS Webhook: {}", body);
            vn.payos.model.webhooks.WebhookData verifiedData = payOS.webhooks().verify(body);
            log.info("Verified PayOS Webhook: {}", verifiedData);
            
            if ("00".equals(verifiedData.getCode())) {
                // Thành công
                String orderId = String.valueOf(verifiedData.getOrderCode());
                log.info("PayOS Webhook payment successful: {}", orderId);
                
                String updateUrl;
                if (orderId.startsWith("APPEAL_")) {
                    String appealId = orderId.substring("APPEAL_".length());
                    updateUrl = userServiceUrl + "/api/users/appeals/internal/" + appealId + "/payment-success";
                } else {
                    updateUrl = orderServiceUrl + "/api/v1/internal/orders/" + orderId + "/payment-success";
                }
                
                Map<String, Object> callbackData = new java.util.HashMap<>();
                callbackData.put("provider", "PAYOS");
                callbackData.put("providerTransactionId", verifiedData.getReference());
                callbackData.put("rawResponse", verifiedData.getDescription());
                
                try {
                    restTemplate.postForEntity(updateUrl, callbackData, Void.class);
                } catch (org.springframework.web.client.RestClientException ex) {
                    log.warn("Could not update order status in order-service (might be a dummy test webhook from PayOS): {}", ex.getMessage());
                }
            }
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("PayOS Webhook failed", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/refund")
    public ResponseEntity<Void> processRefund(@RequestBody Map<String, Object> request) {
        try {
            String method = (String) request.get("method");
            String transactionId = (String) request.get("transactionId");
            Double amount = Double.valueOf(request.get("amount").toString());

            log.info("Processing external gateway REFUND for {} - TxnId: {}, Amount: {}", method, transactionId, amount);
            
            PaymentStrategy strategy = strategyFactory.getStrategy(method);
            strategy.processRefund(transactionId, amount);
            
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Gateway Refund failed", e);
            return ResponseEntity.badRequest().build();
        }
    }
}
