package com.ecommerce.product.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShopCategoryResponse {
    private String id;
    private String sellerId;
    private String name;
    private Integer position;
    private int productCount;
    private List<String> productIds;
}
