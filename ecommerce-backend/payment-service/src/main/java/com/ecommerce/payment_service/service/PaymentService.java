package com.ecommerce.payment_service.service;

import com.ecommerce.payment_service.dto.PaymentRequest;
import com.ecommerce.payment_service.dto.PaymentResponse;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class PaymentService {

    @Value("${stripe.secret.key}")
    private String stripeSecretKey;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeSecretKey;
    }

    public PaymentResponse createPaymentIntent(PaymentRequest request) throws StripeException {
        // Stripe expects amount in smallest currency unit (e.g., cents for USD)
        // If VND, amount is typically the whole value, but Stripe handles it.
        long amountInSmallestUnit = Math.round(request.getAmount() * 100); 
        if ("vnd".equalsIgnoreCase(request.getCurrency())) {
            amountInSmallestUnit = Math.round(request.getAmount()); // VND has no decimal in Stripe
        }

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountInSmallestUnit)
                .setCurrency(request.getCurrency() != null ? request.getCurrency() : "usd")
                .putMetadata("orderId", request.getOrderId())
                .build();

        PaymentIntent intent = PaymentIntent.create(params);

        return PaymentResponse.builder()
                .clientSecret(intent.getClientSecret())
                .paymentIntentId(intent.getId())
                .status(intent.getStatus())
                .build();
    }
}
