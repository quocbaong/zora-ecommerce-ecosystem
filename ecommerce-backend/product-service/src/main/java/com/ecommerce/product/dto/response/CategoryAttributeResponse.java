package com.ecommerce.product.dto.response;

import com.ecommerce.product.entity.AttributeType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryAttributeResponse {

    private String id;
    private String categoryId;
    private String name;
    private String label;
    private AttributeType type;
    private Boolean required;
    private Integer displayOrder;
    private String placeholder;
}
