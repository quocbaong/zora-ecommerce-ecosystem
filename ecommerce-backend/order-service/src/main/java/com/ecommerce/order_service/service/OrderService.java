package com.ecommerce.order_service.service;

import com.ecommerce.order_service.dto.request.OrderRequest;
import com.ecommerce.order_service.dto.request.RefundCreateRequest;
import com.ecommerce.order_service.dto.request.ReturnLogisticsRequest;
import com.ecommerce.order_service.dto.response.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface OrderService {

    OrderResponse create(OrderRequest request, String userId);

    Page<OrderResponse> getAll(Pageable pageable);

    Page<OrderResponse> getMyOrders(String userId, Pageable pageable);

    Page<OrderResponse> getSellerOrders(String sellerId, Pageable pageable);

    OrderResponse getById(String id);

    OrderResponse update(String id, OrderRequest request);

    void delete(String id);

    OrderResponse updateStatus(String id, String status, String callerId);

    OrderResponse shipOrder(String id, String sellerId);

    OrderResponse confirmDelivery(String id, String buyerId);

    OrderResponse cancelOrder(String id, String userId);

    OrderResponse updatePaymentStatus(String id, String paymentStatus);

    OrderResponse updatePaymentMethod(String id, String paymentMethod, String userId);

    OrderResponse requestDispute(String orderId, String buyerId, RefundCreateRequest request);

    OrderResponse chooseLogistics(String orderId, String buyerId, ReturnLogisticsRequest request);

    OrderResponse confirmReturnReceived(String orderId, String sellerId);

    OrderResponse sellerApproveRefund(String orderId, String sellerId);

    OrderResponse approveRefund(String orderId, String adminNote);

    OrderResponse rejectRefund(String id, String adminNote);

    OrderResponse escalateDispute(String orderId, String callerId, java.util.Map<String, Object> body);

    SellerStatsResponse getSellerStats(String sellerId);

    List<RevenueDataPointResponse> getSellerRevenue(String sellerId, String range);

    List<TopProductResponse> getTopProducts(String sellerId, int limit);

    SellerTrendsResponse getSellerTrends(String sellerId);
}