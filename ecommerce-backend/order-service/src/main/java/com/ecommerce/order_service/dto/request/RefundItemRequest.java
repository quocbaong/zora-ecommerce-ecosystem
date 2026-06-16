package com.ecommerce.order_service.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefundItemRequest {
    @NotBlank
    private String orderItemId;

    @Min(1)
    private int quantity;
}
