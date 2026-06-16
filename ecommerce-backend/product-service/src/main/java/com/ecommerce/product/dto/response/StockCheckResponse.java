package com.ecommerce.product.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockCheckResponse {
    private boolean available;
    private List<OutOfStockItem> outOfStockItems;
    private java.util.Map<String, Double> commissionRates;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OutOfStockItem {
        private String productId;
        private String variantId;
        private String productName;
        private int requested;
        private int available;
    }
}
