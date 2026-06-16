package com.ecommerce.product.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class VariantRequest {
    @NotBlank(message = "Tên phân loại không được để trống")
    private String name;

    private BigDecimal price;

    @Min(value = 0)
    private Integer stock;

    private String sku;
}
