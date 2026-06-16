package com.ecommerce.order_service.entity;

import jakarta.persistence.*;
import lombok.*;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShippingAddress {

    private String fullName;

    private String phoneNumber;

    private String street;

    private String ward;

    private String district;

    private String province;

    private String postalCode;

    public String getFullAddress() {
        return String.format("%s, %s, %s, %s, %s",
                street, ward, district, province, postalCode);
    }
}
