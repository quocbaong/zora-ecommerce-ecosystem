package com.ecommerce.user_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreditCardRequest {
    private String cardBrand;
    private String last4Digits;
    private String expiryDate;
    private String cardHolderName;
    private boolean isDefault;
    private String otp;
}
