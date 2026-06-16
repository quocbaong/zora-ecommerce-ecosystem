package com.ecommerce.order_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReturnLogisticsRequest {
    @NotBlank
    private String shippingMethod; // PICKUP, DROP_OFF, SELF_ARRANGE

    private String trackingCode;
    
    private String carrier;
}
