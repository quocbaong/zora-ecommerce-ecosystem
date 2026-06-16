package com.ecommerce.product.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Shape biến thể mà frontend gửi kèm khi tạo/sửa sản phẩm.
 * id chỉ có khi update để match variant đã tồn tại.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VariantPayload {
    private String id;
    private String color;
    private String size;
    @Builder.Default
    private BigDecimal additionalPrice = BigDecimal.ZERO;
    @Builder.Default
    private Integer stock = 0;
}
