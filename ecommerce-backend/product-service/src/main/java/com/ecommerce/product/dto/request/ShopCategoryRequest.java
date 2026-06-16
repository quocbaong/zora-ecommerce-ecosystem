package com.ecommerce.product.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class ShopCategoryRequest {
    @NotBlank(message = "Tên danh mục không được trống")
    @Size(max = 100, message = "Tên danh mục tối đa 100 ký tự")
    private String name;

    private Integer position;

    private List<String> productIds;
}
