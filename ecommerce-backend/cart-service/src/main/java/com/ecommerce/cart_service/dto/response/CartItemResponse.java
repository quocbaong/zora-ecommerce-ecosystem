package com.ecommerce.cart_service.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CartItemResponse {
    private String id;
    private String productId;
    private String variantId;
    private String variantName;
    private String name;
    private String image;
    private String sellerId;
    private Integer quantity;
    private Double price;
    private Double subtotal;
}