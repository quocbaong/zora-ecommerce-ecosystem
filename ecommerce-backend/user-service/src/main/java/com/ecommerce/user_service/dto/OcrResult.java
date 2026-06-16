package com.ecommerce.user_service.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class OcrResult {
    private String idNumber;
    private String fullName;
    private String dateOfBirth;
    private String address;
    private String type;
    private boolean success;
    private String errorMessage;
}
