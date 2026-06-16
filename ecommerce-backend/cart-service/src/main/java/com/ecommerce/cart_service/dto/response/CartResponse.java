package com.ecommerce.cart_service.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CartResponse {
    private String id;
    private String userId;
    private List<CartItemResponse> items;
    private Integer totalQuantity;
    private Double totalPrice;
}
