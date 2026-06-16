package com.ecommerce.order_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ShippingAddressRequest {

    @NotBlank(message = "fullName không được để trống")
    private String fullName;

    @NotBlank(message = "phoneNumber không được để trống")
    private String phoneNumber;

    @NotBlank(message = "street không được để trống")
    private String street;

    @NotBlank(message = "ward không được để trống")
    private String ward;

    @NotBlank(message = "district không được để trống")
    private String district;

    @NotBlank(message = "province không được để trống")
    private String province;

    private String postalCode;

    private Boolean isDefault;
}
