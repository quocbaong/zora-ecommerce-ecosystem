package com.ecommerce.payment_service.strategy;

import com.ecommerce.payment_service.dto.PaymentRequest;
import com.ecommerce.payment_service.dto.PaymentResponse;

public interface PaymentStrategy {
    PaymentResponse createPayment(PaymentRequest request) throws Exception;
    void verifyWebhook(String payload, String signature) throws Exception;
    void processRefund(String transactionId, Double amount) throws Exception;
}
