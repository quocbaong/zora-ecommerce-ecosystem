package com.ecommerce.order_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SellerTrendsResponse {
    private double revenueLast7d;
    private double revenuePrev7d;
    private long ordersLast7d;
    private long ordersPrev7d;
    private long cancelledLast7d;
    private long cancelledPrev7d;
    private List<RevenueDataPointResponse> dailyTrend;
    private List<TrendingProductResponse> topMovers;
}
