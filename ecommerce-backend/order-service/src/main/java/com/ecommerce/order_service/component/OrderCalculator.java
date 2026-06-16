package com.ecommerce.order_service.component;

import com.ecommerce.order_service.dto.request.OrderItemRequest;
import com.ecommerce.order_service.dto.request.ShippingAddressRequest;
import com.ecommerce.order_service.entity.ShippingAddress;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class OrderCalculator {

    public double calculateTotal(List<OrderItemRequest> items, Double shippingFee, Double discount) {
        if (items == null) return 0;
        double itemsTotal = items.stream()
                .mapToDouble(i -> i.getPrice() * i.getQuantity())
                .sum();
        double total = itemsTotal + (shippingFee != null ? shippingFee : 0.0) - (discount != null ? discount : 0.0);
        return Math.max(0, total);
    }

    public ShippingAddress buildAddress(ShippingAddressRequest req) {
        return ShippingAddress.builder()
                .fullName(req.getFullName())
                .phoneNumber(req.getPhoneNumber())
                .street(req.getStreet())
                .ward(req.getWard())
                .district(req.getDistrict())
                .province(req.getProvince())
                .postalCode(req.getPostalCode())
                .build();
    }
}
