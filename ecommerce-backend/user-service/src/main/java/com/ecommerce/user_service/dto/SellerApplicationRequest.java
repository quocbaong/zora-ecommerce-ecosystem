package com.ecommerce.user_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class SellerApplicationRequest {

    // Step 1 — Shop info
    @NotBlank
    @Size(max = 100)
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

    // Step 2 — KYC
    @NotBlank
    private String accountType; // INDIVIDUAL, HOUSEHOLD, COMPANY

    @Size(max = 100)
    private String fullName;

    @Size(max = 20)
    private String idNumber;

    @NotBlank
    private String idFrontUrl;

    @NotBlank
    private String idBackUrl;

    @NotBlank
    private String selfieUrl;

    private LocalDate dateOfBirth;

    private String permanentAddress;

    // Business only (nullable for INDIVIDUAL)
    private String businessName;
    private String taxCode;
    private String businessLicenseUrl;

    // Step 3 — Bank
    @NotBlank
    private String bankName;

    @NotBlank
    private String bankAccount;

    @NotBlank
    private String bankHolder;

    private String bankBranch;

    // OCR results (returned by /ocr-cccd, sent back by frontend for server to store)
    private String ocrFullName;
    private String ocrIdNumber;
}
