package com.ecommerce.payment_service.strategy;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class PaymentStrategyFactory {

    private final Map<String, PaymentStrategy> strategies;

    public PaymentStrategy getStrategy(String paymentMethod) {
        // paymentMethod: STRIPE, MOMO, PAYOS
        String beanName = paymentMethod.toLowerCase() + "PaymentStrategy";
        PaymentStrategy strategy = strategies.get(beanName);
        
        if (strategy == null) {
            throw new IllegalArgumentException("Unsupported payment method: " + paymentMethod);
        }
        return strategy;
    }
}
