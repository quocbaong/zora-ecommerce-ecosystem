package com.ecommerce.order_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SellerStatsResponse {
    private long totalOrders;
    private double totalRevenue;
    private long activeProducts; // computed from product-service, default 0 here
    private long newOrdersToday;
}
