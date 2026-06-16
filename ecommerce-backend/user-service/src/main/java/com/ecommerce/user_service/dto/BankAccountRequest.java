package com.ecommerce.user_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BankAccountRequest {
    private String bankName;
    private String accountNumber;
    private String accountHolderName;
    private String branchName;
    private boolean isDefault;
    private String otp;
}
