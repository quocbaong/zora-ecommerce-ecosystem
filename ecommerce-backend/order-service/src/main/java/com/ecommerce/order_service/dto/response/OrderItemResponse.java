package com.ecommerce.order_service.dto.response;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderItemResponse {

    private String id;

    private String productId;

    private String productName;

    private String productImage;

    private Integer quantity;

    private Double price;

    private String variantId;

    private String sellerId;

    private Double subtotal;
}
