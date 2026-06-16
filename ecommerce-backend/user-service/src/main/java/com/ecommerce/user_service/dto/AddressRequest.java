package com.ecommerce.user_service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddressRequest {
    private String receiverName;
    private String phone;
    private String province;
    private String district;
    private String ward;
    private String street;

    @JsonProperty("default")
    private Boolean isDefault;

    private Integer ghnProvinceId;
    private Integer ghnDistrictId;
    private String ghnWardCode;
}
