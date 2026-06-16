package com.ecommerce.cart_service.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ApiResponse<T> {
    private boolean success;
    private T data;
    private String message;
    private String error;
}