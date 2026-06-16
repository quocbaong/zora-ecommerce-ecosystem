package com.ecommerce.user_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseResponse {
    private String sellerId;
    private String warehouseProvince;
    private String warehouseDistrict;
    private String warehouseWard;
    private String warehouseStreet;
    private String warehousePhone;
    private Integer warehouseGhnProvinceId;
    private Integer warehouseGhnDistrictId;
    private String warehouseGhnWardCode;
    private boolean configured;
}
