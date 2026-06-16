package com.ecommerce.order_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderItemRequest {

    @NotBlank(message = "productId không được để trống")
    private String productId;

    @Positive(message = "quantity phải > 0")
    private Integer quantity;

    private String variantId;

    @Positive(message = "price phải > 0")
    private Double price;

    private String productName;

    private String productImage;

    private String sellerId;
}
