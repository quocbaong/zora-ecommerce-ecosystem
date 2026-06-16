package com.ecommerce.order_service.dto.response;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RefundItemResponse {
    private String orderItemId;
    private int quantity;
}
