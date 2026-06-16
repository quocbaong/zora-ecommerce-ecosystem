package com.ecommerce.order_service.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.util.List;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderRequest {

    @NotEmpty(message = "items không được để trống")
    @Valid
    private List<OrderItemRequest> items;

    @Valid
    @NotNull(message = "shippingAddress không được để trống")
    private ShippingAddressRequest shippingAddress;

    @NotNull(message = "paymentMethod không được để trống")
    private String paymentMethod;

    private String voucherId;

    // GHN ID của địa chỉ giao hàng — bắt buộc để backend tính fee
    private Integer toGhnDistrictId;
    private String toGhnWardCode;

    // Fee tổng client-side hiển thị — backend sẽ tính lại để verify
    private Double clientShippingFee;
}