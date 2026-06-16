package com.ecommerce.cart_service.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CartItemRequest {

    @NotNull
    private String productId;

    private String variantId;

    private String variantName;

    @Min(1)
    private Integer quantity;

    @NotNull
    private Double price;

    private String name;
    private String image;
    private String sellerId;
}