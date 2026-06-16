package com.ecommerce.order_service.service.impl;

import com.ecommerce.order_service.component.OrderEventPublisher;
import com.ecommerce.order_service.component.OrderCalculator;
import com.ecommerce.order_service.component.OrderValidator;
import com.ecommerce.order_service.dto.request.OrderRequest;
import com.ecommerce.order_service.dto.response.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.ecommerce.order_service.entity.Order;
import com.ecommerce.order_service.entity.ShippingAddress;
import com.ecommerce.order_service.exception.CustomException;
import com.ecommerce.order_service.repository.OrderRepository;
import com.ecommerce.order_service.repository.PaymentTransactionRepository;
import com.ecommerce.order_service.repository.RefundRequestRepository;
import com.ecommerce.order_service.entity.PaymentTransaction;
import com.ecommerce.order_service.entity.RefundRequest;
import com.ecommerce.order_service.entity.RefundItem;
import com.ecommerce.order_service.entity.ReturnShipment;
import com.ecommerce.order_service.dto.request.RefundCreateRequest;
import com.ecommerce.order_service.dto.request.ReturnLogisticsRequest;
import com.ecommerce.order_service.service.OrderService;
import com.ecommerce.order_service.service.VoucherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderServiceImpl implements OrderService {

    private final OrderRepository repository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final RefundRequestRepository refundRequestRepository;
    private final OrderCalculator orderCalculator;
    private final OrderValidator orderValidator;
    private final OrderPersistenceHandler persistenceHandler;
    private final OrderEventPublisher orderEventPublisher;
    private final RestTemplate restTemplate;
    private final VoucherService voucherService;
    private final com.ecommerce.order_service.shipping.ShippingFeeCalculator shippingFeeCalculator;
    private final org.redisson.api.RedissonClient redissonClient;

    @Value("${services.product-url}")
    private String productServiceUrl;

    @Value("${services.user-url}")
    private String userServiceUrl;

    @Value("${services.payment-url:http://payment-service:8080}")
    private String paymentServiceUrl;

    @Override
    public OrderResponse create(OrderRequest request, String userId) {
        List<org.redisson.api.RLock> acquiredLocks = new ArrayList<>();
        try {
            // Sort product IDs to prevent deadlocks when multiple concurrent requests lock different products
            List<String> sortedProductIds = request.getItems().stream()
                    .map(com.ecommerce.order_service.dto.request.OrderItemRequest::getProductId)
                    .distinct()
                    .sorted()
                    .toList();

            // Acquire locks for all products in the order
            for (String productId : sortedProductIds) {
                org.redisson.api.RLock lock = redissonClient.getLock("lock:product:" + productId);
                try {
                    // Try to acquire lock within 3 seconds, auto-release after 15 seconds
                    boolean isLocked = lock.tryLock(3, 15, java.util.concurrent.TimeUnit.SECONDS);
                    if (isLocked) {
                        acquiredLocks.add(lock);
                    } else {
                        log.warn("Failed to acquire lock for product {}", productId);
                        throw new CustomException("Sản phẩm đang được người khác thanh toán, vui lòng thử lại sau!", HttpStatus.CONFLICT);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new CustomException("Hệ thống bận, vui lòng thử lại!", HttpStatus.INTERNAL_SERVER_ERROR);
                }
            }

            // 1. Validate stock — HTTP call outside any DB transaction (Circuit Breaker)
            Map<String, Double> commissionRates = orderValidator.validateStock(request);

            // 2. Pure calculations — no I/O (chỉ tính subtotal items, fee/discount cộng sau)
            double subtotal = orderCalculator.calculateTotal(request.getItems(), 0.0, 0.0);
            ShippingAddress address = orderCalculator.buildAddress(request.getShippingAddress());

            // 2b. Apply voucher if any
            double discount = 0.0;
            String voucherId = null;
            if (request.getVoucherId() != null && !request.getVoucherId().isBlank()) {
                var voucher = voucherService.findById(request.getVoucherId());
                if (voucher != null) {
                    String sellerId = voucher.getSellerId();
                    java.math.BigDecimal sellerSubtotal = request.getItems().stream()
                            .filter(i -> sellerId.equals(i.getSellerId()))
                            .map(i -> java.math.BigDecimal.valueOf(i.getPrice()).multiply(java.math.BigDecimal.valueOf(i.getQuantity())))
                            .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
                    java.math.BigDecimal d = voucherService.computeDiscount(voucher.getId(), sellerId, userId, sellerSubtotal);
                    if (d.compareTo(java.math.BigDecimal.ZERO) > 0) {
                        discount = d.doubleValue();
                        voucherId = voucher.getId();
                    }
                }
            }
            // 2c. Tính phí ship server-side (group theo seller, gọi GHN)
            double shippingFee = shippingFeeCalculator.calculate(
                    request.getItems(),
                    request.getToGhnDistrictId(),
                    request.getToGhnWardCode()
            );

            // 2d. Verify client-side fee — nếu lệch > 10% thì reject (chống tampering)
            if (request.getClientShippingFee() != null && request.getClientShippingFee() > 0) {
                double clientFee = request.getClientShippingFee();
                double diff = Math.abs(shippingFee - clientFee);
                double tolerance = Math.max(5000.0, shippingFee * 0.10);
                if (diff > tolerance) {
                    log.warn("Shipping fee mismatch: client={}, server={}", clientFee, shippingFee);
                    throw new com.ecommerce.order_service.exception.CustomException(
                            "Phí vận chuyển không khớp. Vui lòng tải lại trang.",
                            org.springframework.http.HttpStatus.BAD_REQUEST);
                }
            }

            double totalPrice = Math.max(0.0, subtotal - discount + shippingFee);

            // 3. Atomic DB write: order + items + outbox event (single transaction, NO HTTP)
            Order savedOrder = persistenceHandler.persist(request, userId, totalPrice, address, voucherId,
                    discount > 0 ? discount : null, shippingFee, commissionRates);

            // 3b. Increment voucher usage
            if (voucherId != null) {
                voucherService.incrementUsage(voucherId);
            }

            // 4. Decrement stock — HTTP call after DB commit (Circuit Breaker)
            orderValidator.decrementStock(request.getItems());

            // 5. Clear cart items đã đặt — do frontend tự xoá theo từng id để chỉ xoá item được chọn,
            // tránh wipe sạch giỏ hàng khi user chỉ checkout một phần.

            return mapToResponse(savedOrder);
        } finally {
            // Release all acquired locks in reverse order
            for (int i = acquiredLocks.size() - 1; i >= 0; i--) {
                org.redisson.api.RLock lock = acquiredLocks.get(i);
                if (lock != null && lock.isHeldByCurrentThread()) {
                    lock.unlock();
                }
            }
        }
    }

    @Override
    public Page<OrderResponse> getAll(Pageable pageable) {
        return repository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    public Page<OrderResponse> getMyOrders(String userId, Pageable pageable) {
        return repository.findByUserId(userId, pageable).map(this::mapToResponse);
    }

    @Override
    public Page<OrderResponse> getSellerOrders(String sellerId, Pageable pageable) {
        return repository.findBySellerIdPaged(sellerId, pageable).map(this::mapToResponse);
    }

    @Override
    @Transactional
    public OrderResponse getById(String id) {
        Order order = repository.findById(id)
                .orElseThrow(() -> new CustomException("Order not found", HttpStatus.NOT_FOUND));
        return mapToResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse update(String id, OrderRequest request) {
        Order order = repository.findById(id)
                .orElseThrow(() -> new CustomException("Order not found", HttpStatus.NOT_FOUND));

        if (request.getShippingAddress() != null) {
            order.setShippingAddress(orderCalculator.buildAddress(request.getShippingAddress()));
        }
        if (request.getItems() != null && !request.getItems().isEmpty()) {
            order.setTotalPrice(orderCalculator.calculateTotal(
                    request.getItems(),
                    order.getShippingFee(),
                    order.getDiscountAmount()
            ));
        }

        return mapToResponse(repository.save(order));
    }

    @Override
    @Transactional
    public void delete(String id) {
        if (!repository.existsById(id)) {
            throw new CustomException("Order not found", HttpStatus.NOT_FOUND);
        }
        repository.deleteById(id);
    }

    @Override
    @Transactional
    public OrderResponse updateStatus(String id, String status, String callerId) {
        Order order = repository.findById(id)
                .orElseThrow(() -> new CustomException("Order not found", HttpStatus.NOT_FOUND));

        List<String> validStatuses = List.of("PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED", "DISPUTED", "REFUNDED");
        if (!validStatuses.contains(status)) {
            throw new CustomException("Invalid order status: " + status, HttpStatus.BAD_REQUEST);
        }

        // Validate seller ownership: chỉ log cảnh báo, không block — tránh regression với data cũ
        if (callerId != null) {
            boolean isOwner = order.getItems().stream().anyMatch(i -> callerId.equals(i.getSellerId()));
            boolean isBuyer = callerId.equals(order.getUserId());
            if (!isOwner && !isBuyer) {
                log.warn("[updateStatus] User {} is updating order {} but is not seller/buyer of any item", callerId, id);
            }
        }

        order.setStatus(status);
        OrderResponse response = mapToResponse(repository.save(order));
        String eventSellerId = (order.getItems() == null || order.getItems().isEmpty()) ? null : order.getItems().get(0).getSellerId();
        orderEventPublisher.scheduleOrderStatusChanged(order.getId(), order.getUserId(), eventSellerId, status, null);

        return response;
    }

    @Override
    @Transactional
    public OrderResponse updatePaymentStatus(String id, String paymentStatus) {
        Order order = repository.findById(id)
                .orElseThrow(() -> new CustomException("Order not found", HttpStatus.NOT_FOUND));

        List<String> validStatuses = List.of("PENDING", "PAID", "FAILED");
        if (!validStatuses.contains(paymentStatus)) {
            throw new CustomException("Invalid payment status: " + paymentStatus, HttpStatus.BAD_REQUEST);
        }

        order.setPaymentStatus(paymentStatus);
        
        // Cập nhật trạng thái đơn hàng nếu thanh toán thành công hoặc thất bại
        if ("PAID".equals(paymentStatus) && "PENDING".equals(order.getStatus())) {
            order.setStatus("CONFIRMED");
        } else if ("FAILED".equals(paymentStatus)) {
            order.setStatus("CANCELLED");
        }

        return mapToResponse(repository.save(order));
    }

    @Override
    @Transactional
    public OrderResponse updatePaymentMethod(String id, String paymentMethod, String userId) {
        Order order = repository.findById(id)
                .orElseThrow(() -> new CustomException("Order not found", HttpStatus.NOT_FOUND));

        if (!order.getUserId().equals(userId)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }

        if (!"PENDING".equals(order.getStatus()) || !"PENDING".equals(order.getPaymentStatus())) {
            throw new CustomException("Chỉ có thể đổi phương thức thanh toán cho đơn hàng chờ thanh toán", HttpStatus.BAD_REQUEST);
        }

        List<String> validMethods = List.of("COD", "ONLINE", "MOMO", "PAYOS", "STRIPE");
        if (!validMethods.contains(paymentMethod)) {
            throw new CustomException("Phương thức thanh toán không hợp lệ", HttpStatus.BAD_REQUEST);
        }

        order.setPaymentMethod(paymentMethod);
        return mapToResponse(repository.save(order));
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(String id, String userId) {
        Order order = repository.findById(id)
                .orElseThrow(() -> new CustomException("Order not found", HttpStatus.NOT_FOUND));

        if (!"SYSTEM".equals(userId) && !order.getUserId().equals(userId)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }

        if (!"PENDING".equals(order.getStatus()) && !"CONFIRMED".equals(order.getStatus())) {
            throw new CustomException("Chỉ có thể hủy đơn hàng PENDING hoặc CONFIRMED", HttpStatus.BAD_REQUEST);
        }

        order.setStatus("CANCELLED");
        
        // Auto-Refund on Cancel
        if ("PAID".equals(order.getPaymentStatus())) {
            try {
                String sellerId = order.getItems().isEmpty() ? "UNKNOWN_SELLER" : order.getItems().get(0).getSellerId();
                double amount = order.getTotalPrice();
                double commission = order.getTotalCommissionFee() != null ? order.getTotalCommissionFee() : amount * 0.05;
                double shippingFee = order.getShippingFee() != null ? order.getShippingFee() : 0.0;
                
                // Bước 1: Rollback Escrow (Nội bộ ZORA)
                String refundUrl = userServiceUrl + "/api/v1/internal/wallets/refund";
                String orderName = getOrderName(order);
                Map<String, Object> request = java.util.Map.of(
                        "orderId", order.getId(),
                        "orderName", orderName,
                        "buyerId", order.getUserId(),
                        "sellerId", sellerId,
                        "paymentMethod", order.getPaymentMethod(),
                        "totalAmount", amount,
                        "commissionFee", commission,
                        "shippingFee", shippingFee,
                        "isDelivered", false
                );
                restTemplate.postForEntity(refundUrl, request, Void.class);

                // Bước 2: Đánh dấu hoàn tiền ngay sau khi Escrow thành công
                // (Nhất quán với approveRefund - tránh paymentStatus bị kẹt PAID nếu Gateway lỗi sau đó)
                order.setPaymentStatus("REFUNDED");
                
                // Bước 3: Hoàn tiền qua cổng thanh toán thực tế (Stripe/MoMo)
                if ("STRIPE".equalsIgnoreCase(order.getPaymentMethod()) || "ONLINE".equalsIgnoreCase(order.getPaymentMethod()) || "MOMO".equalsIgnoreCase(order.getPaymentMethod()) || "PAYOS".equalsIgnoreCase(order.getPaymentMethod())) {
                    String paymentGatewayRefundUrl = paymentServiceUrl + "/payments/refund";
                    
                    String realTransactionId = paymentTransactionRepository.findByOrderId(order.getId())
                            .map(PaymentTransaction::getProviderTransactionId)
                            .orElse(order.getId());

                    String gatewayMethod = "ONLINE".equalsIgnoreCase(order.getPaymentMethod()) ? "STRIPE" : order.getPaymentMethod();

                    Map<String, Object> gatewayRequest = java.util.Map.of(
                            "method", gatewayMethod,
                            "transactionId", realTransactionId,
                            "amount", amount
                    );
                    
                    try {
                        restTemplate.postForEntity(paymentGatewayRefundUrl, gatewayRequest, Void.class);
                    } catch (Exception ex) {
                        // Gateway lỗi nhưng Escrow đã được rollback rồi. paymentStatus=REFUNDED vẫn được lưu.
                        // Admin cần xử lý thủ công phần gateway nếu cần.
                        log.error("Warning: Gateway refund failed for Cancelled Order {}. Internal refund succeeded. Manual gateway refund might be required.", order.getId(), ex);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to process auto-refund for cancelled order {}", order.getId(), e);
                throw new CustomException("Lỗi hệ thống khi hoàn tiền tự động", HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
        
        // Rollback Inventory
        orderValidator.incrementStock(order.getItems());

        OrderResponse response = mapToResponse(repository.save(order));
        String eventSellerId = (order.getItems() == null || order.getItems().isEmpty()) ? null : order.getItems().get(0).getSellerId();
        orderEventPublisher.scheduleOrderStatusChanged(order.getId(), order.getUserId(), eventSellerId, order.getStatus(), null);
        return response;
    }

    @Override
    @Transactional
    public OrderResponse shipOrder(String id, String sellerId) {
        Order order = repository.findById(id)
                .orElseThrow(() -> new CustomException("Order not found", HttpStatus.NOT_FOUND));

        boolean isSellerOrder = order.getItems().stream().anyMatch(i -> sellerId.equals(i.getSellerId()));
        if (!isSellerOrder) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }

        if (!"CONFIRMED".equals(order.getStatus())) {
            throw new CustomException("Only CONFIRMED orders can be shipped", HttpStatus.BAD_REQUEST);
        }

        order.setStatus("SHIPPING");
        order.setTrackingNumber("ZORA-GHN-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        order.setShippingProvider("Giao Hàng Nhanh");
        order.setEstimatedDeliveryDate(java.time.LocalDate.now().plusDays(3));

        OrderResponse response = mapToResponse(repository.save(order));
        String eventSellerId = (order.getItems() == null || order.getItems().isEmpty()) ? null : order.getItems().get(0).getSellerId();
        orderEventPublisher.scheduleOrderStatusChanged(order.getId(), order.getUserId(), eventSellerId, order.getStatus(), null);
        return response;
    }

    @Override
    @Transactional
    public OrderResponse confirmDelivery(String id, String buyerId) {
        Order order = repository.findById(id)
                .orElseThrow(() -> new CustomException("Order not found", HttpStatus.NOT_FOUND));

        if (!order.getUserId().equals(buyerId)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }

        if (!"SHIPPING".equals(order.getStatus())) {
            throw new CustomException("Only SHIPPING orders can be delivered", HttpStatus.BAD_REQUEST);
        }

        order.setStatus("DELIVERED");
        order.setDeliveredAt(LocalDateTime.now());
        if ("COD".equals(order.getPaymentMethod()) && !"PAID".equals(order.getPaymentStatus())) {
            order.setPaymentStatus("PAID");
        }

        OrderResponse response = mapToResponse(repository.save(order));
        String eventSellerId = (order.getItems() == null || order.getItems().isEmpty()) ? null : order.getItems().get(0).getSellerId();
        orderEventPublisher.scheduleOrderStatusChanged(order.getId(), order.getUserId(), eventSellerId, order.getStatus(), null);
        // Kích hoạt giải phóng tiền hoặc nạp tiền
        if ("PAID".equals(order.getPaymentStatus())) {
            try {
                String sellerId = order.getItems().isEmpty() ? "UNKNOWN_SELLER" : order.getItems().get(0).getSellerId();
                double amount = order.getTotalPrice();
                double commission = order.getTotalCommissionFee() != null ? order.getTotalCommissionFee() : amount * 0.05;
                double shippingFee = order.getShippingFee() != null ? order.getShippingFee() : 0.0;
                
                if ("COD".equals(order.getPaymentMethod())) {
                    // COD: Tiền chưa có trong hệ thống, gọi Settlement để đưa thẳng tiền vào Ví Khả Dụng
                    String settlementUrl = userServiceUrl + "/api/v1/internal/wallets/settlement";
                    String orderName = getOrderName(order);
                    Map<String, Object> request = java.util.Map.of(
                            "orderId", order.getId(),
                            "orderName", orderName,
                            "totalAmount", amount,
                            "commissionFee", commission,
                            "shippingFee", shippingFee,
                            "isDirectAvailable", true,
                            "sellerId", sellerId
                    );
                    restTemplate.postForEntity(settlementUrl, request, Void.class);
                } else {
                    // Stripe/Online: Tiền đã ở trong Tạm Giữ, chỉ việc giải phóng phần của Seller
                    String releaseUrl = userServiceUrl + "/api/v1/internal/wallets/escrow/release";
                    double sellerAmount = amount - commission - shippingFee;
                    String orderName = getOrderName(order);
                    Map<String, Object> request = java.util.Map.of(
                            "orderId", order.getId(),
                            "orderName", orderName,
                            "sellerId", sellerId,
                            "amount", sellerAmount
                    );
                    restTemplate.postForEntity(releaseUrl, request, Void.class);
                }
            } catch (Exception e) {
                log.error("Failed to process wallet settlement/release for order {}", order.getId(), e);
            }
        }

        return response;
    }

    @Override
    @Transactional
    public OrderResponse requestDispute(String id, String buyerId, RefundCreateRequest request) {
        Order order = repository.findById(id)
                .orElseThrow(() -> new CustomException("Order not found", HttpStatus.NOT_FOUND));

        if (!order.getUserId().equals(buyerId)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }

        if (!"SHIPPING".equals(order.getStatus()) && !"DELIVERED".equals(order.getStatus())) {
            throw new CustomException("Chỉ có thể khiếu nại đơn hàng đang giao hoặc đã giao", HttpStatus.BAD_REQUEST);
        }

        if (order.getDeliveredAt() != null && order.getDeliveredAt().plusDays(15).isBefore(LocalDateTime.now())) {
            throw new CustomException("Đã quá 15 ngày kể từ ngày giao hàng, không thể khiếu nại", HttpStatus.BAD_REQUEST);
        }

        if (refundRequestRepository.findByOrderId(id).isPresent()) {
            throw new CustomException("Khiếu nại của đơn hàng này đã tồn tại", HttpStatus.BAD_REQUEST);
        }

        order.setStatus("DISPUTED");
        
        RefundRequest refundRequest = RefundRequest.builder()
                .orderId(order.getId())
                .buyerId(buyerId)
                .sellerId(order.getItems().get(0).getSellerId())
                .type(request.getType())
                .status("REQUESTED")
                .reason(request.getReason())
                .evidenceUrls(request.getEvidenceUrls())
                .build();
                
        List<RefundItem> items = request.getItems().stream().map(reqItem -> RefundItem.builder()
                .refundRequest(refundRequest)
                .orderItemId(reqItem.getOrderItemId())
                .quantity(reqItem.getQuantity())
                .build()).toList();
        refundRequest.setItems(items);
        refundRequestRepository.save(refundRequest);
        
        OrderResponse response = mapToResponse(repository.save(order));
        String eventSellerId = (order.getItems() == null || order.getItems().isEmpty()) ? null : order.getItems().get(0).getSellerId();
        orderEventPublisher.scheduleOrderStatusChanged(order.getId(), order.getUserId(), eventSellerId, order.getStatus(), null);
        return response;
    }

    @Override
    @Transactional
    public OrderResponse chooseLogistics(String orderId, String buyerId, ReturnLogisticsRequest request) {
        RefundRequest refundRequest = refundRequestRepository.findByOrderId(orderId)
                .orElseThrow(() -> new CustomException("Không tìm thấy yêu cầu khiếu nại", HttpStatus.NOT_FOUND));
        
        if (!refundRequest.getBuyerId().equals(buyerId)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }

        if (!"WAITING_FOR_RETURN".equals(refundRequest.getStatus())) {
            throw new CustomException("Không thể chọn đơn vị vận chuyển ở trạng thái này", HttpStatus.BAD_REQUEST);
        }

        ReturnShipment shipment = ReturnShipment.builder()
                .refundRequest(refundRequest)
                .shippingMethod(request.getShippingMethod())
                .trackingCode("SELF_ARRANGE".equals(request.getShippingMethod()) ? request.getTrackingCode() : "ZORA-RET-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .carrier("SELF_ARRANGE".equals(request.getShippingMethod()) ? request.getCarrier() : "Giao Hàng Nhanh")
                .status("PENDING")
                .shippedAt(LocalDateTime.now())
                .build();
        
        refundRequest.setReturnShipment(shipment);
        refundRequest.setStatus("RETURN_SHIPPING");
        refundRequestRepository.save(refundRequest);

        Order order = repository.findById(orderId).orElseThrow();
        return mapToResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse confirmReturnReceived(String orderId, String sellerId) {
        RefundRequest refundRequest = refundRequestRepository.findByOrderId(orderId)
                .orElseThrow(() -> new CustomException("Không tìm thấy yêu cầu khiếu nại", HttpStatus.NOT_FOUND));
                
        if (!refundRequest.getSellerId().equals(sellerId)) {
            throw new CustomException("Access denied", HttpStatus.FORBIDDEN);
        }
        
        if (!"RETURN_SHIPPING".equals(refundRequest.getStatus())) {
            throw new CustomException("Đơn hàng chưa được vận chuyển", HttpStatus.BAD_REQUEST);
        }

        refundRequest.getReturnShipment().setStatus("DELIVERED");
        refundRequest.getReturnShipment().setReceivedAt(LocalDateTime.now());
        refundRequest.setStatus("RETURN_RECEIVED");
        refundRequestRepository.save(refundRequest);

        Order order = repository.findById(orderId).orElseThrow();
        return mapToResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse sellerApproveRefund(String orderId, String sellerId) {
        Order order = repository.findById(orderId)
                .orElseThrow(() -> new CustomException("Order not found", HttpStatus.NOT_FOUND));

        // Kiểm tra quyền sở hữu của Seller (Đơn này có thuộc về Seller đang bấm hay không)
        String actualSellerId = order.getItems().get(0).getSellerId();
        if (!actualSellerId.equals(sellerId)) {
            throw new CustomException("You do not have permission to approve refund for this order", HttpStatus.FORBIDDEN);
        }

        // Nếu hợp lệ, gọi hàm approveRefund lõi của hệ thống
        return approveRefund(orderId, "Người bán đã tự động đồng ý hoàn tiền.");
    }

    @Override
    @Transactional
    public OrderResponse escalateDispute(String orderId, String callerId, Map<String, Object> body) {
        Order order = repository.findById(orderId)
                .orElseThrow(() -> new CustomException("Order not found", HttpStatus.NOT_FOUND));

        if (!"DISPUTED".equals(order.getStatus())) {
            throw new CustomException("Đơn hàng không ở trạng thái khiếu nại", HttpStatus.BAD_REQUEST);
        }
        
        RefundRequest refundReq = refundRequestRepository.findByOrderId(orderId)
                .orElseThrow(() -> new CustomException("Không tìm thấy yêu cầu khiếu nại", HttpStatus.NOT_FOUND));

        boolean isSeller = callerId != null && order.getItems().stream().anyMatch(i -> callerId.equals(i.getSellerId()));
        boolean isBuyer = callerId != null && callerId.equals(order.getUserId());
        
        if (!isSeller && !isBuyer) {
            throw new CustomException("Không có quyền thao tác", HttpStatus.FORBIDDEN);
        }

        if ("REQUESTED".equals(refundReq.getStatus()) || "RETURN_RECEIVED".equals(refundReq.getStatus())) {
            if (isSeller) {
                if (body != null) {
                    if (body.containsKey("sellerEvidenceUrls")) {
                        refundReq.setSellerEvidenceUrls((List<String>) body.get("sellerEvidenceUrls"));
                    }
                    if (body.containsKey("sellerDisputeReason")) {
                        refundReq.setSellerDisputeReason((String) body.get("sellerDisputeReason"));
                    }
                }
                if ("RETURN_RECEIVED".equals(refundReq.getStatus())) {
                    refundReq.setStatus("DISPUTED_BY_SELLER");
                } else {
                    refundReq.setStatus("UNDER_REVIEW");
                }
            } else {
                refundReq.setStatus("UNDER_REVIEW");
            }
        } else {
            throw new CustomException("Trạng thái khiếu nại không hợp lệ để nhờ Admin phân xử", HttpStatus.BAD_REQUEST);
        }

        refundRequestRepository.save(refundReq);
        return mapToResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse approveRefund(String id, String adminNote) {
        Order order = repository.findById(id)
                .orElseThrow(() -> new CustomException("Order not found", HttpStatus.NOT_FOUND));

        if (!"DISPUTED".equals(order.getStatus())) {
            throw new CustomException("Chỉ có thể hoàn tiền cho đơn hàng đang bị khiếu nại", HttpStatus.BAD_REQUEST);
        }

        RefundRequest refundRequest = refundRequestRepository.findByOrderId(id)
                .orElseThrow(() -> new CustomException("Không tìm thấy yêu cầu khiếu nại", HttpStatus.NOT_FOUND));

        if ("RETURN_AND_REFUND".equals(refundRequest.getType()) && 
            ("REQUESTED".equals(refundRequest.getStatus()) || "UNDER_REVIEW".equals(refundRequest.getStatus()))) {
            // Chuyển sang chờ trả hàng
            refundRequest.setStatus("WAITING_FOR_RETURN");
            refundRequestRepository.save(refundRequest);
            // Không hoàn tiền ngay
            return mapToResponse(order);
        }

        boolean wasAlreadyPaid = "PAID".equals(order.getPaymentStatus());
        boolean wasAlreadyDelivered = order.getDeliveredAt() != null;

        order.setStatus("REFUNDED");
        order.setPaymentStatus("REFUNDED");
        refundRequest.setStatus("REFUNDED");
        refundRequestRepository.save(refundRequest);

        boolean hasMoneyToRefund = false;
        if ("STRIPE".equalsIgnoreCase(order.getPaymentMethod()) || "ONLINE".equalsIgnoreCase(order.getPaymentMethod()) || "MOMO".equalsIgnoreCase(order.getPaymentMethod()) || "PAYOS".equalsIgnoreCase(order.getPaymentMethod())) {
            hasMoneyToRefund = wasAlreadyPaid;
        } else {
            hasMoneyToRefund = wasAlreadyDelivered;
        }

        if (hasMoneyToRefund) {
            try {
                String sellerId = order.getItems().isEmpty() ? "UNKNOWN_SELLER" : order.getItems().get(0).getSellerId();
                double amount = order.getTotalPrice();
                double commission = order.getTotalCommissionFee() != null ? order.getTotalCommissionFee() : amount * 0.05;
                double shippingFee = order.getShippingFee() != null ? order.getShippingFee() : 0.0;
                
                // Gọi API Rollback Refund của User Service
                String refundUrl = userServiceUrl + "/api/v1/internal/wallets/refund";
                String orderName = getOrderName(order);
                Map<String, Object> request = java.util.Map.of(
                        "orderId", order.getId(),
                        "orderName", orderName,
                        "buyerId", order.getUserId(),
                        "sellerId", sellerId,
                        "paymentMethod", order.getPaymentMethod(),
                        "totalAmount", amount,
                        "commissionFee", commission,
                        "shippingFee", shippingFee,
                        "isDelivered", wasAlreadyDelivered
                );
                restTemplate.postForEntity(refundUrl, request, Void.class);
                
                // Giai đoạn 3: Gọi cổng Stripe/MoMo qua Payment Service
                if ("STRIPE".equalsIgnoreCase(order.getPaymentMethod()) || "ONLINE".equalsIgnoreCase(order.getPaymentMethod()) || "MOMO".equalsIgnoreCase(order.getPaymentMethod())) {
                    String paymentGatewayRefundUrl = paymentServiceUrl + "/payments/refund";
                    
                    String realTransactionId = paymentTransactionRepository.findByOrderId(order.getId())
                            .map(PaymentTransaction::getProviderTransactionId)
                            .orElse(order.getId());

                    // Nếu là ONLINE thì thực chất là STRIPE, nên truyền method là STRIPE để payment-service hiểu
                    String gatewayMethod = "ONLINE".equalsIgnoreCase(order.getPaymentMethod()) ? "STRIPE" : order.getPaymentMethod();

                    Map<String, Object> gatewayRequest = java.util.Map.of(
                            "method", gatewayMethod,
                            "transactionId", realTransactionId,
                            "amount", amount
                    );
                    
                    try {
                        restTemplate.postForEntity(paymentGatewayRefundUrl, gatewayRequest, Void.class);
                        log.info("Successfully requested Gateway Refund for Order {}", order.getId());
                    } catch (Exception ex) {
                        log.error("Warning: Gateway refund failed for Order {}. Manual refund might be required.", order.getId(), ex);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to process refund rollback for order {}", order.getId(), e);
                throw new CustomException("Lỗi hệ thống khi hoàn tiền ví", HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }

        OrderResponse response = mapToResponse(repository.save(order));
        String eventSellerId = (order.getItems() == null || order.getItems().isEmpty()) ? null : order.getItems().get(0).getSellerId();
        orderEventPublisher.scheduleOrderStatusChanged(order.getId(), order.getUserId(), eventSellerId, order.getStatus(), adminNote);
        return response;
    }

    @Override
    @Transactional
    public OrderResponse rejectRefund(String id, String adminNote) {
        Order order = repository.findById(id)
                .orElseThrow(() -> new CustomException("Order not found", HttpStatus.NOT_FOUND));

        if (!"DISPUTED".equals(order.getStatus())) {
            throw new CustomException("Chỉ có thể từ chối khiếu nại của đơn hàng DISPUTED", HttpStatus.BAD_REQUEST);
        }

        boolean wasAlreadyDelivered = order.getDeliveredAt() != null;

        // Bác bỏ khiếu nại -> Đơn hàng coi như đã giao xong
        order.setStatus("DELIVERED");
        
        refundRequestRepository.findByOrderId(id).ifPresent(refundRequest -> {
            refundRequest.setStatus("REJECTED");
            refundRequestRepository.save(refundRequest);
        });
        if (!wasAlreadyDelivered) {
            order.setDeliveredAt(LocalDateTime.now());
            if ("COD".equals(order.getPaymentMethod()) && !"PAID".equals(order.getPaymentStatus())) {
                order.setPaymentStatus("PAID");
            }
        }

        OrderResponse response = mapToResponse(repository.save(order));
        String eventSellerId = (order.getItems() == null || order.getItems().isEmpty()) ? null : order.getItems().get(0).getSellerId();
        orderEventPublisher.scheduleOrderStatusChanged(order.getId(), order.getUserId(), eventSellerId, order.getStatus(), adminNote);
        
        // Kích hoạt thanh toán cho Seller CHỈ KHI trước đó Seller chưa nhận tiền (chưa Delivered)
        if (!wasAlreadyDelivered && "PAID".equals(order.getPaymentStatus())) {
            try {
                String sellerId = order.getItems().isEmpty() ? "UNKNOWN_SELLER" : order.getItems().get(0).getSellerId();
                double amount = order.getTotalPrice();
                double commission = order.getTotalCommissionFee() != null ? order.getTotalCommissionFee() : amount * 0.05;
                double shippingFee = order.getShippingFee() != null ? order.getShippingFee() : 0.0;
                
                if ("COD".equals(order.getPaymentMethod())) {
                    String settlementUrl = userServiceUrl + "/api/v1/internal/wallets/settlement";
                    String orderName = getOrderName(order);
                    Map<String, Object> request = java.util.Map.of(
                            "orderId", order.getId(),
                            "orderName", orderName,
                            "totalAmount", amount,
                            "commissionFee", commission,
                            "shippingFee", shippingFee,
                            "isDirectAvailable", true,
                            "sellerId", sellerId
                    );
                    restTemplate.postForEntity(settlementUrl, request, Void.class);
                } else {
                    String releaseUrl = userServiceUrl + "/api/v1/internal/wallets/escrow/release";
                    double sellerAmount = amount - commission - shippingFee;
                    String orderName = getOrderName(order);
                    Map<String, Object> request = java.util.Map.of(
                            "orderId", order.getId(),
                            "orderName", orderName,
                            "sellerId", sellerId,
                            "amount", sellerAmount
                    );
                    restTemplate.postForEntity(releaseUrl, request, Void.class);
                }
            } catch (Exception e) {
                log.error("Failed to release money after rejecting refund for order {}", order.getId(), e);
            }
        }
        return response;
    }

    @Override
    public SellerStatsResponse getSellerStats(String sellerId) {
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        Object result = repository.sellerStatsAggregate(sellerId, startOfDay);
        
        Object[] row;
        if (result instanceof Object[] arr && arr.length > 0 && arr[0] instanceof Object[]) {
            row = (Object[]) arr[0];
        } else if (result instanceof Object[] arr) {
            row = arr;
        } else if (result instanceof List<?> list && !list.isEmpty()) {
            row = (Object[]) list.get(0);
        } else {
            row = new Object[]{0L, 0.0, 0L};
        }

        long total = row.length > 0 && row[0] instanceof Number n ? n.longValue() : 0L;
        double revenue = row.length > 1 && row[1] instanceof Number n ? n.doubleValue() : 0.0;
        long newToday = row.length > 2 && row[2] instanceof Number n ? n.longValue() : 0L;

        long activeProducts = 0;
        try {
            String url = productServiceUrl + "/products?sellerId=" + sellerId + "&size=1";
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.getForObject(url, Map.class);
            if (resp != null && resp.get("totalElements") instanceof Number n) {
                activeProducts = n.longValue();
            }
        } catch (Exception e) {
            log.warn("Could not fetch activeProducts from product-service: {}", e.getMessage());
        }

        return SellerStatsResponse.builder()
                .totalOrders(total)
                .totalRevenue(revenue)
                .activeProducts(activeProducts)
                .newOrdersToday(newToday)
                .build();
    }

    @Override
    public List<RevenueDataPointResponse> getSellerRevenue(String sellerId, String range) {
        List<Object[]> rows = "month".equals(range)
                ? repository.revenueByMonth(sellerId)
                : repository.revenueByDay(sellerId, LocalDateTime.now().minusDays(30));

        List<RevenueDataPointResponse> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(RevenueDataPointResponse.builder()
                    .label(row[0] != null ? row[0].toString() : "")
                    .revenue(row[1] instanceof Number ? ((Number) row[1]).doubleValue() : 0)
                    .orders(row[2] instanceof Number ? ((Number) row[2]).longValue() : 0)
                    .build());
        }
        return result;
    }

    @Override
    public SellerTrendsResponse getSellerTrends(String sellerId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start7d = now.minusDays(7);
        LocalDateTime start14d = now.minusDays(14);

        // Aggregate metrics
        List<Object[]> aggList = repository.sellerTrendsAggregate(sellerId, start7d, start14d);
        Object[] agg = aggList.isEmpty()
                ? new Object[]{0.0, 0.0, 0L, 0L, 0L, 0L}
                : aggList.get(0);

        double rev7d = agg[0] instanceof Number n ? n.doubleValue() : 0.0;
        double revPrev7d = agg[1] instanceof Number n ? n.doubleValue() : 0.0;
        long orders7d = agg[2] instanceof Number n ? n.longValue() : 0L;
        long ordersPrev7d = agg[3] instanceof Number n ? n.longValue() : 0L;
        long cancelled7d = agg[4] instanceof Number n ? n.longValue() : 0L;
        long cancelledPrev7d = agg[5] instanceof Number n ? n.longValue() : 0L;

        // Daily trend last 14 days — reuse existing query
        List<RevenueDataPointResponse> daily = new ArrayList<>();
        for (Object[] row : repository.revenueByDay(sellerId, start14d)) {
            daily.add(RevenueDataPointResponse.builder()
                    .label(row[0] != null ? row[0].toString() : "")
                    .revenue(row[1] instanceof Number ? ((Number) row[1]).doubleValue() : 0)
                    .orders(row[2] instanceof Number ? ((Number) row[2]).longValue() : 0)
                    .build());
        }

        // Top movers
        List<TrendingProductResponse> movers = new ArrayList<>();
        for (Object[] row : repository.sellerTopMovers(sellerId, start7d, start14d, 10)) {
            movers.add(TrendingProductResponse.builder()
                    .productId(row[0] != null ? row[0].toString() : "")
                    .productName(row[1] != null ? row[1].toString() : "")
                    .productImage(row[2] != null ? row[2].toString() : null)
                    .revenueLast7d(row[3] instanceof Number ? ((Number) row[3]).doubleValue() : 0)
                    .revenuePrev7d(row[4] instanceof Number ? ((Number) row[4]).doubleValue() : 0)
                    .soldLast7d(row[5] instanceof Number ? ((Number) row[5]).longValue() : 0)
                    .build());
        }

        return SellerTrendsResponse.builder()
                .revenueLast7d(rev7d)
                .revenuePrev7d(revPrev7d)
                .ordersLast7d(orders7d)
                .ordersPrev7d(ordersPrev7d)
                .cancelledLast7d(cancelled7d)
                .cancelledPrev7d(cancelledPrev7d)
                .dailyTrend(daily)
                .topMovers(movers)
                .build();
    }

    @Override
    public List<TopProductResponse> getTopProducts(String sellerId, int limit) {
        List<Object[]> rows = repository.topProducts(sellerId, limit);
        List<TopProductResponse> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(TopProductResponse.builder()
                    .productId(row[0] != null ? row[0].toString() : "")
                    .productName(row[1] != null ? row[1].toString() : "")
                    .productImage(row[2] != null ? row[2].toString() : null)
                    .totalSold(row[3] instanceof Number ? ((Number) row[3]).longValue() : 0)
                    .totalRevenue(row[4] instanceof Number ? ((Number) row[4]).doubleValue() : 0)
                    .build());
        }
        return result;
    }

    private OrderResponse mapToResponse(Order order) {
        List<OrderItemResponse> itemsResponse = order.getItems() != null
                ? order.getItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .id(item.getId())
                        .productId(item.getProductId())
                        .productName(item.getProductName())
                        .productImage(item.getProductImage())
                        .quantity(item.getQuantity())
                        .price(item.getPrice())
                        .variantId(item.getVariantId())
                        .sellerId(item.getSellerId())
                        .subtotal(item.getSubtotal())
                        .build())
                .toList()
                : List.of();

        ShippingAddressResponse addressResponse = null;
        if (order.getShippingAddress() != null) {
            addressResponse = ShippingAddressResponse.builder()
                    .fullName(order.getShippingAddress().getFullName())
                    .phoneNumber(order.getShippingAddress().getPhoneNumber())
                    .street(order.getShippingAddress().getStreet())
                    .ward(order.getShippingAddress().getWard())
                    .district(order.getShippingAddress().getDistrict())
                    .province(order.getShippingAddress().getProvince())
                    .postalCode(order.getShippingAddress().getPostalCode())
                    .fullAddress(order.getShippingAddress().getFullAddress())
                    .build();
        }

        return OrderResponse.builder()
                .id(order.getId())
                .userId(order.getUserId())
                .totalPrice(order.getTotalPrice())
                .voucherId(order.getVoucherId())
                .discountAmount(order.getDiscountAmount())
                .shippingFee(order.getShippingFee())
                .status(order.getStatus())
                .paymentMethod(order.getPaymentMethod())
                .paymentStatus(order.getPaymentStatus())
                .trackingNumber(order.getTrackingNumber())
                .shippingProvider(order.getShippingProvider())
                .estimatedDeliveryDate(order.getEstimatedDeliveryDate())
                .deliveredAt(order.getDeliveredAt())
                .shippingAddress(addressResponse)
                .refundRequest(mapRefundRequest(order.getId()))
                .items(itemsResponse)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }

    private String getOrderName(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            return "đơn " + order.getId();
        }
        String name = order.getItems().get(0).getProductName();
        if (order.getItems().size() > 1) {
            name += " và " + (order.getItems().size() - 1) + " sản phẩm khác";
        }
        return name;
    }

    private RefundRequestResponse mapRefundRequest(String orderId) {
        return refundRequestRepository.findByOrderId(orderId).map(req -> RefundRequestResponse.builder()
                .id(req.getId())
                .type(req.getType())
                .status(req.getStatus())
                .reason(req.getReason())
                .requestedAmount(req.getRequestedAmount())
                .approvedAmount(req.getApprovedAmount())
                .evidenceUrls(req.getEvidenceUrls())
                .sellerEvidenceUrls(req.getSellerEvidenceUrls())
                .sellerDisputeReason(req.getSellerDisputeReason())
                .createdAt(req.getCreatedAt())
                .updatedAt(req.getUpdatedAt())
                .items(req.getItems() != null ? req.getItems().stream().map(i -> RefundItemResponse.builder()
                        .orderItemId(i.getOrderItemId())
                        .quantity(i.getQuantity())
                        .build()).toList() : List.of())
                .returnShipment(req.getReturnShipment() != null ? ReturnShipmentResponse.builder()
                        .shippingMethod(req.getReturnShipment().getShippingMethod())
                        .trackingCode(req.getReturnShipment().getTrackingCode())
                        .carrier(req.getReturnShipment().getCarrier())
                        .status(req.getReturnShipment().getStatus())
                        .shippedAt(req.getReturnShipment().getShippedAt())
                        .build() : null)
                .build()).orElse(null);
    }
}
