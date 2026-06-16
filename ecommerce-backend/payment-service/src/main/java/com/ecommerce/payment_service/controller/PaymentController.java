package com.ecommerce.payment_service.controller;

import com.ecommerce.payment_service.dto.PaymentRequest;
import com.ecommerce.payment_service.dto.PaymentResponse;
import com.ecommerce.payment_service.service.PaymentService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;
    private final RestTemplate restTemplate;

    @Value("${stripe.webhook.secret}")
    private String endpointSecret;

    @Value("${services.order-url}")
    private String orderServiceUrl;

    @PostMapping("/create-intent")
    public ResponseEntity<PaymentResponse> createPaymentIntent(@RequestBody PaymentRequest request) {
        try {
            PaymentResponse response = paymentService.createPaymentIntent(request);
            return ResponseEntity.ok(response);
        } catch (StripeException e) {
            log.error("Stripe error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleStripeWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {
        
        Event event;
        try {
            event = Webhook.constructEvent(payload, sigHeader, endpointSecret);
        } catch (SignatureVerificationException e) {
            log.error("Webhook signature verification failed");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Webhook error: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode rootNode = mapper.readTree(payload);
            com.fasterxml.jackson.databind.JsonNode objectNode = rootNode.path("data").path("object");
            String orderId = objectNode.path("metadata").path("orderId").asText(null);
            String transactionId = objectNode.path("id").asText(null);

            if ("payment_intent.succeeded".equals(event.getType())) {
                if (orderId != null) {
                    log.info("Payment succeeded for order (parsed manually): {} with TxnId: {}", orderId, transactionId);
                    updateOrderStatus(orderId, "PAID", transactionId);
                }
            } else if ("payment_intent.payment_failed".equals(event.getType())) {
                if (orderId != null) {
                    log.info("Payment failed for order (parsed manually): {}", orderId);
                    updateOrderStatus(orderId, "FAILED", transactionId);
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse event manually: {}", e.getMessage());
        }

        return ResponseEntity.ok("Success");
    }

    private void updateOrderStatus(String orderId, String paymentStatus, String transactionId) {
        if (orderId == null || orderId.isEmpty()) return;
        
        try {
            if ("PAID".equals(paymentStatus)) {
                String updateUrl = orderServiceUrl + "/api/v1/internal/orders/" + orderId + "/payment-success";
                java.util.Map<String, Object> callbackData = new java.util.HashMap<>();
                callbackData.put("provider", "STRIPE");
                callbackData.put("providerTransactionId", transactionId);
                callbackData.put("rawResponse", "Stripe webhook payment intent succeeded");
                
                restTemplate.postForEntity(updateUrl, callbackData, Void.class);
                log.info("Updated order {} payment status to PAID with TxnId {}", orderId, transactionId);
            } else {
                // FALLBACK for FAILED status
                String url = orderServiceUrl + "/orders/" + orderId + "/payment-status?paymentStatus=" + paymentStatus;
                restTemplate.patchForObject(url, null, Object.class);
                log.info("Updated order {} payment status to {}", orderId, paymentStatus);
            }
        } catch (Exception e) {
            log.error("Failed to update order status for {}: {}", orderId, e.getMessage());
        }
    }
}
