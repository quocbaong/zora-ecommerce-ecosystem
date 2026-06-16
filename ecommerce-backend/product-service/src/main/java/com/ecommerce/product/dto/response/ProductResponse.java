package com.ecommerce.product.dto.response;

import com.ecommerce.product.entity.ProductStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {

    private String id;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer stock;
    private String categoryId;
    private String categoryName;
    private List<VariantResponse> variants;
    private BigDecimal ratingAvg;
    private Integer ratingCount;
    private Integer soldCount;
    private Integer discountPercent;
    private Boolean verified;
    private ProductStatus status;
    private LocalDate createdAt;
    private List<String> images;
    private String sellerId;
    private Map<String, Object> attributes;
    private Integer weightG;
    private Integer lengthCm;
    private Integer widthCm;
    private Integer heightCm;
}
