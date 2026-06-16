package com.ecommerce.order_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class VoucherRequest {

    @NotBlank
    private String code;

    private String title;

    @NotBlank
    private String discountType;

    @NotNull
    @Positive
    private BigDecimal discountValue;

    private BigDecimal minOrderAmount;

    private BigDecimal maxDiscount;

    private Integer usageLimit;

    private LocalDateTime expiresAt;

    private Boolean active;

    // Chỉ áp dụng khi tạo private voucher (gửi qua chat). Null = public.
    private String targetUserId;
}
