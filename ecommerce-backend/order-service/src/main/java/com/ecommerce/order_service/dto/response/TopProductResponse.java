package com.ecommerce.order_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TopProductResponse {
    private String productId;
    private String productName;
    private String productImage;
    private long totalSold;
    private double totalRevenue;
}
