package com.ecommerce.product.dto.request;

import com.ecommerce.product.entity.AttributeType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryAttributeRequest {

    @NotBlank(message = "Khóa thuộc tính không được để trống")
    @Size(max = 60, message = "Khóa thuộc tính tối đa 60 ký tự")
    @Pattern(regexp = "^[a-z][a-z0-9_]*$", message = "Khóa chỉ gồm chữ thường, số và dấu _, bắt đầu bằng chữ")
    private String name;

    @NotBlank(message = "Nhãn hiển thị không được để trống")
    @Size(max = 120, message = "Nhãn tối đa 120 ký tự")
    private String label;

    @NotNull(message = "Kiểu dữ liệu là bắt buộc")
    private AttributeType type;

    @Builder.Default
    private Boolean required = false;

    @Builder.Default
    private Integer displayOrder = 0;

    @Size(max = 200, message = "Placeholder tối đa 200 ký tự")
    private String placeholder;
}
