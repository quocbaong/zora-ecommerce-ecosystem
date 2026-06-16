package com.ecommerce.payment_service.strategy;

import com.ecommerce.payment_service.dto.PaymentRequest;
import com.ecommerce.payment_service.dto.PaymentResponse;
import com.ecommerce.payment_service.service.PaymentService;
import com.stripe.model.Refund;
import com.stripe.param.RefundCreateParams;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component("stripePaymentStrategy")
@RequiredArgsConstructor
public class StripePaymentStrategy implements PaymentStrategy {

    private final PaymentService paymentService;

    @Override
    public PaymentResponse createPayment(PaymentRequest request) throws Exception {
        // Gọi lại logic Stripe cũ đã làm
        return paymentService.createPaymentIntent(request);
    }

    @Override
    public void verifyWebhook(String payload, String signature) throws Exception {
        // Stripe webhook signature verification
    }

    @Override
    public void processRefund(String transactionId, Double amount) throws Exception {
        // Stripe VND is a zero-decimal currency, no need to multiply by 100
        RefundCreateParams params = RefundCreateParams.builder()
                .setPaymentIntent(transactionId)
                .setAmount(Math.round(amount))
                .build();
        Refund.create(params);
    }
}
