package com.ecommerce.payment_service.strategy;

import com.ecommerce.payment_service.dto.PaymentRequest;
import com.ecommerce.payment_service.dto.PaymentResponse;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PaymentStrategyFactoryTest {

    private PaymentStrategy dummy() {
        return new PaymentStrategy() {
            @Override
            public PaymentResponse createPayment(PaymentRequest request) {
                return null;
            }

            @Override
            public void verifyWebhook(String payload, String signature) {
            }

            @Override
            public void processRefund(String transactionId, Double amount) {
            }
        };
    }

    @Test
    void returnsStrategyMatchingMethodName() {
        PaymentStrategy stripe = dummy();
        PaymentStrategyFactory factory = new PaymentStrategyFactory(
                Map.of("stripePaymentStrategy", stripe, "momoPaymentStrategy", dummy()));

        assertSame(stripe, factory.getStrategy("STRIPE"));
    }

    @Test
    void methodLookupIsCaseInsensitive() {
        PaymentStrategy payos = dummy();
        PaymentStrategyFactory factory = new PaymentStrategyFactory(
                Map.of("payosPaymentStrategy", payos));

        assertSame(payos, factory.getStrategy("PayOS"));
    }

    @Test
    void throwsOnUnsupportedMethod() {
        PaymentStrategyFactory factory = new PaymentStrategyFactory(Map.of());

        assertThrows(IllegalArgumentException.class, () -> factory.getStrategy("BITCOIN"));
    }
}
