package com.ecommerce.product.dto.request;

import com.ecommerce.product.entity.ProductStatus;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
public class ProductUpdateRequest {
    private String name;
    private String description;
    private BigDecimal price;
    private Integer stock;
    private String categoryId;
    private ProductStatus status;
    private Map<String, Object> attributes;
    private List<VariantPayload> variants;
    private Integer weightG;
    private Integer lengthCm;
    private Integer widthCm;
    private Integer heightCm;
}
