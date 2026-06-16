package com.ecommerce.payment_service.dto;

import lombok.Data;

@Data
public class PaymentRequest {
    private String orderId;
    private Double amount;
    private String currency; // e.g. "usd", "vnd"
}
