package com.ecommerce.user_service.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class SellerApplicationResponse {

    private String id;
    private String userId;
    private String status;
    private String shopName;
    private String shopDescription;
    private String mainCategory;
    private String warehouseAddress;
    private String warehouseStreet;
    private String warehouseProvince;
    private String warehouseDistrict;
    private String warehouseWard;
    private Integer warehouseGhnProvinceId;
    private Integer warehouseGhnDistrictId;
    private String warehouseGhnWardCode;
    private String accountType;
    private String fullName;
    private String idNumber;
    private String idFrontUrl;
    private String idBackUrl;
    private String selfieUrl;
    private String taxCode;
    private String bankName;
    private String bankAccount;
    private String bankHolder;
    private String bankBranch;
    private Boolean bankNameMatch;
    private Boolean ocrMatch;
    private String ocrFullName;
    private String ocrIdNumber;
    private String rejectionReason;
    private Integer resubmitCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
