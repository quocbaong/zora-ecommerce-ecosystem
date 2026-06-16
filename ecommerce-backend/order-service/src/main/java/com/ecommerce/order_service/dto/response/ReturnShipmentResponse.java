package com.ecommerce.order_service.dto.response;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ReturnShipmentResponse {
    private String shippingMethod;
    private String trackingCode;
    private String carrier;
    private String status;
    private LocalDateTime shippedAt;
}
