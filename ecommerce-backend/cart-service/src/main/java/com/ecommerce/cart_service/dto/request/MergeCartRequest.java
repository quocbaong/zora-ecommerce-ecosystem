package com.ecommerce.cart_service.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class MergeCartRequest {
    private List<MergeCartItemRequest> items;

    @Data
    public static class MergeCartItemRequest {
        private String productId;
        private String variantId;
        private String variantName;
        private String name;
        private String image;
        private Integer quantity;
        private Double price;
        private String sellerId;
    }
}
