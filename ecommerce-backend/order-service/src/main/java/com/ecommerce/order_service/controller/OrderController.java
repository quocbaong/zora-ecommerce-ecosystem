package com.ecommerce.order_service.controller;

import com.ecommerce.order_service.dto.request.OrderRequest;
import com.ecommerce.order_service.dto.request.RefundCreateRequest;
import com.ecommerce.order_service.dto.request.ReturnLogisticsRequest;
import com.ecommerce.order_service.dto.response.*;
import com.ecommerce.order_service.repository.OrderRepository;
import com.ecommerce.order_service.service.OrderService;
import com.ecommerce.order_service.service.S3Service;
import com.ecommerce.order_service.exception.CustomException;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/orders")
public class OrderController {

    private final OrderService orderService;
    private final OrderRepository orderRepository;
    private final S3Service s3Service;

    public OrderController(OrderService orderService, OrderRepository orderRepository, S3Service s3Service) {
        this.orderService = orderService;
        this.orderRepository = orderRepository;
        this.s3Service = s3Service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(
            @Valid @RequestBody OrderRequest request,
            @RequestHeader(value = "X-User-Id") String userId) {
        return orderService.create(request, userId);
    }

    @PostMapping("/upload-evidence")
    public ResponseEntity<Map<String, String>> uploadEvidence(@RequestPart("file") MultipartFile file) {
        if (file.getContentType() != null && file.getContentType().startsWith("image/")) {
            if (file.getSize() > 10 * 1024 * 1024) { // 10MB
                throw new CustomException("Hình ảnh không được vượt quá 10MB", HttpStatus.BAD_REQUEST);
            }
        }
        if (file.getContentType() != null && file.getContentType().startsWith("video/")) {
            if (file.getSize() > 30 * 1024 * 1024) { // 30MB
                throw new CustomException("Video không được vượt quá 30MB", HttpStatus.BAD_REQUEST);
            }
        }
        String url = s3Service.uploadFile(file);
        return ResponseEntity.ok(Map.of("url", url));
    }

    // Admin overview stats — protected by gateway (ADMIN only)
    @GetMapping("/admin/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        List<Object[]> results = orderRepository.adminStatsAggregate(startOfDay, startOfMonth);
        Object[] row = results.get(0);
        return ResponseEntity.ok(Map.of(
                "totalOrders",    ((Number) row[0]).longValue(),
                "totalRevenue",   row[1],
                "revenueToday",   row[2],
                "revenueMonth",   row[3],
                "pendingOrders",  ((Number) row[4]).longValue(),
                "confirmedOrders",((Number) row[5]).longValue(),
                "shippingOrders", ((Number) row[6]).longValue(),
                "deliveredOrders",((Number) row[7]).longValue(),
                "cancelledOrders",((Number) row[8]).longValue()
        ));
    }

    // Chỉ ADMIN được gọi — được bảo vệ tại RoleAuthorizationFilter
    @GetMapping
    public Page<OrderResponse> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return orderService.getAll(PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }

    // User lấy đơn hàng của chính mình
    @GetMapping("/my")
    public Page<OrderResponse> getMyOrders(
            @RequestHeader(value = "X-User-Id") String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return orderService.getMyOrders(userId, PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }

    // Seller lấy đơn hàng có chứa sản phẩm của mình — bảo vệ tại RoleAuthorizationFilter (SELLER/ADMIN)
    @GetMapping("/seller")
    public Page<OrderResponse> getSellerOrders(
            @RequestHeader(value = "X-User-Id") String sellerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return orderService.getSellerOrders(sellerId, PageRequest.of(page, size, Sort.by("createdAt").descending()));
    }

    @GetMapping("/seller/stats")
    public SellerStatsResponse getSellerStats(
            @RequestHeader(value = "X-User-Id") String sellerId) {
        return orderService.getSellerStats(sellerId);
    }

    @GetMapping("/seller/revenue")
    public List<RevenueDataPointResponse> getSellerRevenue(
            @RequestHeader(value = "X-User-Id") String sellerId,
            @RequestParam(defaultValue = "day") String range) {
        return orderService.getSellerRevenue(sellerId, range);
    }

    @GetMapping("/seller/top-products")
    public List<TopProductResponse> getTopProducts(
            @RequestHeader(value = "X-User-Id") String sellerId,
            @RequestParam(defaultValue = "5") int limit) {
        return orderService.getTopProducts(sellerId, limit);
    }

    @GetMapping("/seller/trends")
    public SellerTrendsResponse getSellerTrends(
            @RequestHeader(value = "X-User-Id") String sellerId) {
        return orderService.getSellerTrends(sellerId);
    }

    @GetMapping("/{id}")
    public OrderResponse getById(@PathVariable String id) {
        return orderService.getById(id);
    }

    @PutMapping("/{id}")
    public OrderResponse update(@PathVariable String id,
                                @Valid @RequestBody OrderRequest request) {
        return orderService.update(id, request);
    }

    // SELLER hoặc ADMIN cập nhật trạng thái giao hàng — được bảo vệ tại RoleAuthorizationFilter
    @PatchMapping("/{id}/status")
    public OrderResponse updateStatus(@PathVariable String id,
                                      @RequestParam String status,
                                      @RequestHeader(value = "X-User-Id", required = false) String callerId) {
        return orderService.updateStatus(id, status, callerId);
    }

    // INTERNAL API: Cập nhật trạng thái thanh toán (từ payment-service)
    @PatchMapping("/{id}/payment-status")
    public OrderResponse updatePaymentStatus(@PathVariable String id,
                                             @RequestParam String paymentStatus) {
        return orderService.updatePaymentStatus(id, paymentStatus);
    }

    // Cập nhật phương thức thanh toán
    @PatchMapping("/{id}/payment-method")
    public OrderResponse updatePaymentMethod(@PathVariable String id,
                                             @RequestParam String paymentMethod,
                                             @RequestHeader(value = "X-User-Id") String userId) {
        return orderService.updatePaymentMethod(id, paymentMethod, userId);
    }

    // User hủy đơn hàng của chính mình
    @PatchMapping("/{id}/cancel")
    public OrderResponse cancelOrder(@PathVariable String id,
                                     @RequestHeader(value = "X-User-Id") String userId) {
        return orderService.cancelOrder(id, userId);
    }

    @PatchMapping("/{id}/ship")
    public OrderResponse shipOrder(@PathVariable String id,
                                   @RequestHeader(value = "X-User-Id") String sellerId) {
        return orderService.shipOrder(id, sellerId);
    }

    @PatchMapping("/{id}/deliver")
    public OrderResponse confirmDelivery(@PathVariable String id,
                                         @RequestHeader(value = "X-User-Id") String buyerId) {
        return orderService.confirmDelivery(id, buyerId);
    }

    @PostMapping("/{id}/dispute")
    public OrderResponse requestDispute(@PathVariable String id,
                                        @RequestHeader(value = "X-User-Id") String buyerId,
                                        @Valid @RequestBody RefundCreateRequest request) {
        return orderService.requestDispute(id, buyerId, request);
    }

    @PostMapping("/{id}/dispute/logistics")
    public OrderResponse chooseLogistics(@PathVariable String id,
                                         @RequestHeader(value = "X-User-Id") String buyerId,
                                         @Valid @RequestBody ReturnLogisticsRequest request) {
        return orderService.chooseLogistics(id, buyerId, request);
    }

    @PostMapping("/{id}/confirm-received")
    public OrderResponse confirmReturnReceived(@PathVariable String id,
                                               @RequestHeader(value = "X-User-Id") String sellerId) {
        return orderService.confirmReturnReceived(id, sellerId);
    }

    @PostMapping("/{id}/seller-approve-refund")
    public OrderResponse sellerApproveRefund(@PathVariable String id,
                                             @RequestHeader(value = "X-User-Id") String sellerId) {
        return orderService.sellerApproveRefund(id, sellerId);
    }

    @PostMapping("/{id}/dispute/escalate")
    public OrderResponse escalateDispute(@PathVariable String id,
                                         @RequestHeader(value = "X-User-Id") String callerId,
                                         @RequestBody(required = false) Map<String, Object> body) {
        return orderService.escalateDispute(id, callerId, body);
    }

    @PostMapping("/admin/{id}/refund/approve")
    public OrderResponse adminApproveRefund(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        String adminNote = body != null ? body.get("adminNote") : null;
        return orderService.approveRefund(id, adminNote);
    }

    @PostMapping("/admin/{id}/refund/reject")
    public OrderResponse adminRejectRefund(@PathVariable String id, @RequestBody(required = false) Map<String, String> body) {
        String adminNote = body != null ? body.get("adminNote") : null;
        return orderService.rejectRefund(id, adminNote);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        orderService.delete(id);
    }
}