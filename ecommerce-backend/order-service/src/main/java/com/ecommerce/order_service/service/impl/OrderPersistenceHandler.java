package com.ecommerce.order_service.service.impl;

import com.ecommerce.order_service.component.OrderEventPublisher;
import com.ecommerce.order_service.dto.request.OrderItemRequest;
import com.ecommerce.order_service.dto.request.OrderRequest;
import com.ecommerce.order_service.entity.Order;
import com.ecommerce.order_service.entity.OrderItem;
import com.ecommerce.order_service.entity.ShippingAddress;
import com.ecommerce.order_service.repository.OrderItemRepository;
import com.ecommerce.order_service.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;


@Service
@RequiredArgsConstructor
class OrderPersistenceHandler {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderEventPublisher orderEventPublisher;

    @Transactional
    public Order persist(OrderRequest request, String userId, double totalPrice, ShippingAddress address,
                         String voucherId, Double discountAmount, Double shippingFee, java.util.Map<String, Double> commissionRates) {
        String paymentMethod = request.getPaymentMethod() != null ? request.getPaymentMethod().toUpperCase() : "COD";
        String paymentStatus = "STRIPE".equals(paymentMethod) ? "PENDING" : "PENDING"; // Both pending initially

        Order order = orderRepository.save(Order.builder()
                .userId(userId)
                .totalPrice(totalPrice)
                .shippingFee(shippingFee)
                .status("PENDING")
                .paymentMethod(paymentMethod)
                .paymentStatus(paymentStatus)
                .voucherId(voucherId)
                .discountAmount(discountAmount)
                .shippingAddress(address)
                .build());

        List<OrderItemRequest> items = request.getItems();
        double totalCommissionFee = 0.0;
        if (items != null && !items.isEmpty()) {
            List<OrderItem> entities = new java.util.ArrayList<>();
            for (OrderItemRequest itemReq : items) {
                double rate = commissionRates != null ? commissionRates.getOrDefault(itemReq.getProductId(), 5.0) : 5.0;
                double itemSubtotal = itemReq.getPrice() * itemReq.getQuantity();
                double commissionFee = itemSubtotal * (rate / 100.0);
                totalCommissionFee += commissionFee;
                entities.add(OrderItem.builder()
                        .order(order)
                        .productId(itemReq.getProductId())
                        .productName(itemReq.getProductName())
                        .productImage(itemReq.getProductImage())
                        .quantity(itemReq.getQuantity())
                        .price(itemReq.getPrice())
                        .variantId(itemReq.getVariantId())
                        .sellerId(itemReq.getSellerId())
                        .commissionFee(commissionFee)
                        .build());
            }
            orderItemRepository.saveAll(entities);
        }
        order.setTotalCommissionFee(totalCommissionFee);
        orderRepository.save(order);

        // Save outbox event in the same transaction — Kafka publish happens after commit
        String sellerId = items.isEmpty() ? null : items.get(0).getSellerId();
        orderEventPublisher.scheduleOrderCreated(order.getId(), userId, sellerId, totalPrice);

        return order;
    }
}
