package com.ecommerce.order_service.shipping.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class GhnProvinceDto {

    @JsonAlias("ProvinceID")
    private Integer provinceId;

    @JsonAlias("ProvinceName")
    private String provinceName;

    @JsonAlias("Code")
    private String code;
}
