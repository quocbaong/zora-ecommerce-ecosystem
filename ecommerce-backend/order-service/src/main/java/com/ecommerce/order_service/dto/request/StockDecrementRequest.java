package com.ecommerce.order_service.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockDecrementRequest {
    private String productId;
    private String variantId;
    private Integer quantity;
}
