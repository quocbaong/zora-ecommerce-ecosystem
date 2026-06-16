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
public class ShippingFeeResponse {

    private Long total;

    @JsonAlias("service_fee")
    private Long serviceFee;

    @JsonAlias("insurance_fee")
    private Long insuranceFee;

    @JsonAlias("cod_fee")
    private Long codFee;

    @JsonAlias("pick_remote_areas_fee")
    private Long pickRemoteAreasFee;

    @JsonAlias("deliver_remote_areas_fee")
    private Long deliverRemoteAreasFee;
}
