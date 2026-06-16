package com.ecommerce.auth_service.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // Propagate the intended status code from ResponseStatusException (eg. 404
    // from controllers that throw NOT_FOUND). Without this, the generic
    // RuntimeException handler below would coerce it to 400 because the
    // exception message doesn't match any of the known error codes.
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        Map<String, Object> errorFormat = new HashMap<>();
        errorFormat.put("success", false);
        errorFormat.put("error", ex.getReason() != null ? ex.getReason() : ex.getMessage());
        return ResponseEntity.status(ex.getStatusCode()).body(errorFormat);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(RuntimeException ex) {
        Map<String, Object> errorFormat = new HashMap<>();
        errorFormat.put("success", false);
        
        HttpStatus status = HttpStatus.BAD_REQUEST;
        
        if ("USER_NOT_FOUND".equals(ex.getMessage())) {
            status = HttpStatus.NOT_FOUND;
        } else if ("INVALID_PASSWORD".equals(ex.getMessage()) || "TOKEN_EXPIRED".equals(ex.getMessage())
                || "INVALID_TOKEN".equals(ex.getMessage()) || "TOKEN_REVOKED".equals(ex.getMessage())) {
            status = HttpStatus.UNAUTHORIZED;
        } else if ("EMAIL_ALREADY_EXISTS".equals(ex.getMessage())) {
            status = HttpStatus.CONFLICT;
        } else if ("EMAIL_NOT_VERIFIED".equals(ex.getMessage())) {
            status = HttpStatus.FORBIDDEN;
        } else if ("OTP_EXPIRED".equals(ex.getMessage()) || "INVALID_OTP".equals(ex.getMessage())
                || "INVALID_VERIFICATION_CODE".equals(ex.getMessage())) {
            status = HttpStatus.BAD_REQUEST;
        }
        
        errorFormat.put("error", ex.getMessage());
        return ResponseEntity.status(status).body(errorFormat);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, Object> errorFormat = new HashMap<>();
        errorFormat.put("success", false);
        
        StringBuilder errors = new StringBuilder();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String errorMessage = error.getDefaultMessage();
            errors.append(errorMessage).append(". ");
        });
        
        errorFormat.put("error", errors.toString().trim());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorFormat);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        Map<String, Object> errorFormat = new HashMap<>();
        errorFormat.put("success", false);
        errorFormat.put("error", "METHOD_NOT_ALLOWED");
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(errorFormat);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleAllExceptions(Exception ex) {
        log.error("Internal server error", ex);
        Map<String, Object> errorFormat = new HashMap<>();
        errorFormat.put("success", false);
        errorFormat.put("error", "INTERNAL_SERVER_ERROR");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorFormat);
    }
}
