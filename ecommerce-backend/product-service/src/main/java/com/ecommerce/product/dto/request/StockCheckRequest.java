package com.ecommerce.product.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockCheckRequest {
    private List<StockCheckItem> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockCheckItem {
        private String productId;
        private String variantId;
        private int quantity;
    }
}
