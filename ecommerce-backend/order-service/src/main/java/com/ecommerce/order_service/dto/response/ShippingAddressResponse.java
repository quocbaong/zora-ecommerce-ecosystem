package com.ecommerce.order_service.dto.response;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ShippingAddressResponse {

    private String fullName;

    private String phoneNumber;

    private String street;

    private String ward;

    private String district;

    private String province;

    private String postalCode;

    private String fullAddress;
}
