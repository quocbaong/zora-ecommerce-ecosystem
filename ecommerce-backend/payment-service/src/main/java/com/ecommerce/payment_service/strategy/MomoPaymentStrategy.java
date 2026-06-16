package com.ecommerce.payment_service.strategy;

import com.ecommerce.payment_service.dto.PaymentRequest;
import com.ecommerce.payment_service.dto.PaymentResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component("momoPaymentStrategy")
@RequiredArgsConstructor
@Slf4j
public class MomoPaymentStrategy implements PaymentStrategy {

    private final RestTemplate restTemplate;
    
    // Sử dụng bộ Key Sandbox public chính thức từ Java SDK của MoMo
    private final String partnerCode = "MOMOLRJZ20181206";
    private final String accessKey = "mTCKt9W3eU1m39TW";
    private final String secretKey = "SetA5RDnLHvt51AULf51DyauxUo3kDU6";
    private final String endpoint = "https://test-payment.momo.vn/v2/gateway/api/create";

    @Value("${momo.ipn-url:https://webhook.site/YOUR_WEBHOOK_SITE_URL}")
    private String ipnUrl;

    @Value("${momo.redirect-url:http://localhost:5173/payment-result}")
    private String redirectUrl;

    @Override
    public PaymentResponse createPayment(PaymentRequest request) throws Exception {
        // Nối thêm timestamp để orderId luôn là duy nhất trên hệ thống MoMo (chống lỗi Duplicate Order)
        String orderId = request.getOrderId() + "_" + System.currentTimeMillis();
        String requestId = UUID.randomUUID().toString();
        String amount = String.valueOf(Math.round(request.getAmount()));
        String orderInfo = "Thanh toan don hang " + request.getOrderId();
        String extraData = "";
        String requestType = "captureWallet";

        // Chuẩn bị chuỗi dữ liệu gốc để băm chữ ký (theo đúng Alphabetical order của Java SDK)
        String rawSignature = "accessKey=" + accessKey +
                "&amount=" + amount +
                "&extraData=" + extraData +
                "&ipnUrl=" + ipnUrl +
                "&orderId=" + orderId +
                "&orderInfo=" + orderInfo +
                "&partnerCode=" + partnerCode +
                "&redirectUrl=" + redirectUrl +
                "&requestId=" + requestId +
                "&requestType=" + requestType;

        String signature = signHmacSHA256(rawSignature, secretKey);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("partnerCode", partnerCode);
        requestBody.put("partnerName", "Test Store");
        requestBody.put("storeId", "MomoTestStore");
        requestBody.put("requestId", requestId);
        requestBody.put("amount", Long.parseLong(amount));
        requestBody.put("orderId", orderId);
        requestBody.put("orderInfo", orderInfo);
        requestBody.put("redirectUrl", redirectUrl);
        requestBody.put("ipnUrl", ipnUrl);
        requestBody.put("lang", "vi");
        requestBody.put("requestType", requestType);
        requestBody.put("autoCapture", true);
        requestBody.put("extraData", extraData);
        requestBody.put("signature", signature);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            Map<String, Object> response = restTemplate.postForObject(endpoint, entity, Map.class);
            log.info("MoMo API Response: {}", response);
            
            if (response != null && response.get("payUrl") != null) {
                return PaymentResponse.builder()
                        .paymentIntentId(orderId)
                        .clientSecret((String) response.get("payUrl"))
                        .status("PENDING")
                        .build();
            } else {
                throw new RuntimeException("Failed to get payUrl from MoMo: " + response);
            }
        } catch (Exception e) {
            log.error("Error creating MoMo Payment", e);
            throw e;
        }
    }

    @Override
    public void verifyWebhook(String payload, String signature) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        Map<String, Object> data = mapper.readValue(payload, Map.class);

        // Logic check chữ ký IPN (V2)
        String amount = String.valueOf(data.get("amount"));
        String extraData = (String) data.get("extraData");
        String message = (String) data.get("message");
        String orderId = (String) data.get("orderId");
        String orderInfo = (String) data.get("orderInfo");
        String orderType = (String) data.get("orderType");
        String payType = (String) data.get("payType");
        String requestId = (String) data.get("requestId");
        String responseTime = String.valueOf(data.get("responseTime"));
        String resultCode = String.valueOf(data.get("resultCode"));
        String transId = String.valueOf(data.get("transId"));

        String rawSignature = "accessKey=" + accessKey +
                "&amount=" + amount +
                "&extraData=" + extraData +
                "&message=" + message +
                "&orderId=" + orderId +
                "&orderInfo=" + orderInfo +
                "&orderType=" + orderType +
                "&partnerCode=" + partnerCode +
                "&payType=" + payType +
                "&requestId=" + requestId +
                "&responseTime=" + responseTime +
                "&resultCode=" + resultCode +
                "&transId=" + transId;

        String computedSignature = signHmacSHA256(rawSignature, secretKey);

        if (!computedSignature.equals(signature)) {
            log.error("Invalid MoMo Webhook Signature! Expected: {}, Computed: {}", signature, computedSignature);
            throw new RuntimeException("Invalid Signature");
        }

        if (!"0".equals(resultCode)) {
            throw new RuntimeException("MoMo Payment failed with resultCode: " + resultCode);
        }
    }

    @Override
    public void processRefund(String transactionId, Double amount) throws Exception {
        String refundEndpoint = "https://test-payment.momo.vn/v2/gateway/api/refund";
        String requestId = UUID.randomUUID().toString();
        String orderId = "REFUND_" + System.currentTimeMillis(); 
        String description = "Hoan tien giao dich " + transactionId;
        Long refundAmount = Math.round(amount);

        // Chuẩn bị chuỗi dữ liệu gốc để băm chữ ký hoàn tiền (Alphabetical order)
        String rawSignature = "accessKey=" + accessKey +
                "&amount=" + refundAmount +
                "&description=" + description +
                "&orderId=" + orderId +
                "&partnerCode=" + partnerCode +
                "&requestId=" + requestId +
                "&transId=" + transactionId;

        String signature = signHmacSHA256(rawSignature, secretKey);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("partnerCode", partnerCode);
        requestBody.put("orderId", orderId);
        requestBody.put("requestId", requestId);
        requestBody.put("amount", refundAmount);
        
        // Cố gắng ép kiểu sang số nguyên, nếu test MOCK thì để 0
        try {
            requestBody.put("transId", Long.parseLong(transactionId));
        } catch (NumberFormatException e) {
            requestBody.put("transId", 0L);
            log.warn("Lỗi ép kiểu transId sang số, MoMo sẽ báo lỗi nếu không truyền đúng transId thật.");
        }
        
        requestBody.put("lang", "vi");
        requestBody.put("description", description);
        requestBody.put("signature", signature);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            Map<String, Object> response = restTemplate.postForObject(refundEndpoint, entity, Map.class);
            log.info("MoMo Refund Response: {}", response);
            if (response != null && !"0".equals(String.valueOf(response.get("resultCode")))) {
                log.error("MoMo Refund failed: {}", response.get("message"));
                throw new RuntimeException("MoMo Refund failed: " + response.get("message"));
            }
        } catch (Exception e) {
            log.error("Error processing MoMo Refund", e);
            throw e;
        }
    }

    private String signHmacSHA256(String data, String secretKey) throws Exception {
        SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(secretKeySpec);
        byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(rawHmac.length * 2);
        for (byte b : rawHmac) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
