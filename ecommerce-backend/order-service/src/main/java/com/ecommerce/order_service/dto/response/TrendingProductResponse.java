package com.ecommerce.order_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TrendingProductResponse {
    private String productId;
    private String productName;
    private String productImage;
    private double revenueLast7d;
    private double revenuePrev7d;
    private long soldLast7d;
}
