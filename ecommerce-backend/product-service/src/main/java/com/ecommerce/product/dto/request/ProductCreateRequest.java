package com.ecommerce.product.dto.request;

import com.ecommerce.product.entity.ProductStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductCreateRequest {

    // @NotBlank: Yêu cầu bắt buộc không được bỏ trống (và không chứa toàn dấu cách)
    @NotBlank(message = "Tên sản phẩm không được để trống")
    private String name;

    private String description;

    @NotNull(message = "Giá sản phẩm là bắt buộc")
    @DecimalMin(value = "0.0", inclusive = false, message = "Giá sản phẩm phải lớn hơn 0")
    private BigDecimal price;

    @NotNull(message = "Số lượng tồn kho là bắt buộc")
    @Min(value = 0, message = "Tồn kho không được là số âm")
    private Integer stock;

    @NotBlank(message = "Sản phẩm phải thuộc về một danh mục cụ thể")
    private String categoryId;

    // User không được quyền tự set Rating hay Verified (Vì Shopee tự tính cái đó)
    // Người dùng chỉ có quyền quyết định lúc tạo ra có đăng bán luôn không
    @NotNull(message = "Trạng thái sản phẩm (ACTIVE/DISABLED) là bắt buộc")
    private ProductStatus status;

    // Giá trị các trường thông tin theo schema của danh mục (vd: {"material": "Cotton"})
    private Map<String, Object> attributes;

    private List<VariantPayload> variants;

    @Min(value = 1, message = "Cân nặng phải > 0g")
    private Integer weightG;

    @Min(value = 1, message = "Chiều dài phải > 0cm")
    private Integer lengthCm;

    @Min(value = 1, message = "Chiều rộng phải > 0cm")
    private Integer widthCm;

    @Min(value = 1, message = "Chiều cao phải > 0cm")
    private Integer heightCm;
}
