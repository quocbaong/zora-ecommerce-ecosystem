package com.ecommerce.order_service.shipping.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShippingFeeRequest {

    private Integer fromDistrictId;
    private String fromWardCode;

    @NotNull(message = "toDistrictId is required")
    private Integer toDistrictId;

    @NotNull(message = "toWardCode is required")
    private String toWardCode;

    private Integer serviceTypeId;

    @NotNull(message = "weight is required")
    private Integer weight;

    private Integer length;
    private Integer width;
    private Integer height;

    private Integer insuranceValue;
    private List<Item> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {
        private String name;
        private Integer quantity;
        private Integer weight;
        private Integer length;
        private Integer width;
        private Integer height;
    }
}
