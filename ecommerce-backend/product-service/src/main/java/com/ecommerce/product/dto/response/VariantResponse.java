package com.ecommerce.product.dto.response;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class VariantResponse {
    private String id;
    private String color;   // maps từ ProductVariant.name
    private String size;    // null — backend chưa tách riêng color/size
    private BigDecimal additionalPrice; // = variant.price - product.price
    private Integer stock;
}
