package com.ecommerce.product.exception;

/**
 * Throw khi tài nguyên không tồn tại — GlobalExceptionHandler sẽ trả HTTP 404.
 */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
