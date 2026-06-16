package com.ecommerce.payment_service.strategy;

import com.ecommerce.payment_service.dto.PaymentRequest;
import com.ecommerce.payment_service.dto.PaymentResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;
import vn.payos.model.v2.paymentRequests.PaymentLinkItem;

@Slf4j
@Component("payosPaymentStrategy")
@RequiredArgsConstructor
public class PayOSPaymentStrategy implements PaymentStrategy {

    private final PayOS payOS;

    @Value("${services.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public PaymentResponse createPayment(PaymentRequest request) throws Exception {
        // 1. Tạo orderCode số nguyên ngẫu nhiên duy nhất cho PayOS (yêu cầu dạng số)
        long orderCode = Math.abs((request.getOrderId() + "_" + System.currentTimeMillis()).hashCode());

        // 2. Tạo đối tượng item đại diện
        PaymentLinkItem item = PaymentLinkItem.builder()
                .name("Thanh toan don hang")
                .quantity(1)
                .price(request.getAmount().longValue())
                .build();

        // 3. Khởi tạo đối tượng yêu cầu tạo link
        CreatePaymentLinkRequest paymentData = CreatePaymentLinkRequest.builder()
                .orderCode(orderCode)
                .description("Thanh toan " + orderCode)
                .amount(request.getAmount().longValue())
                .item(item)
                .returnUrl(frontendUrl + "/payment-result?status=success&orderId=" + request.getOrderId() + "&method=payos")
                .cancelUrl(frontendUrl + "/payment-result?status=cancel&orderId=" + request.getOrderId() + "&method=payos")
                .build();

        // 4. Gọi API PayOS để sinh link QR
        CreatePaymentLinkResponse response = payOS.paymentRequests().create(paymentData);

        return PaymentResponse.builder()
                .paymentIntentId(String.valueOf(orderCode))
                .clientSecret(response.getCheckoutUrl()) // FE redirect tới đây
                .status("PENDING")
                .build();
    }

    @Override
    public void verifyWebhook(String payload, String signature) throws Exception {
        // Webhook PayOS verification
    }

    @Override
    public void processRefund(String transactionId, Double amount) throws Exception {
        log.info("MOCK: Gọi API Payout / Chi Hộ của PayOS (hoặc chuyển khoản ngân hàng thủ công). OrderCode/TransId: {}, Amount: {}", transactionId, amount);
        // PayOS không có API trực tiếp refund 1 nút như Stripe. Phải dùng API Chi Hộ.
    }
}
