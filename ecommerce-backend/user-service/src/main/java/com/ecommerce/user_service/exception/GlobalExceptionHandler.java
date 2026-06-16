package com.ecommerce.user_service.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.LocalDateTime;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(ResourceNotFoundException ex) {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.NOT_FOUND.value())
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build();
        return new ResponseEntity<>(errorResponse, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException ex) {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.BAD_REQUEST.value())
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build();
        return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalStateException(IllegalStateException ex) {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.CONFLICT.value())
                .message(mapBusinessMessage(ex.getMessage()))
                .timestamp(LocalDateTime.now())
                .build();
        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        String raw = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();
        String code = "DATA_INTEGRITY_VIOLATION";
        if (raw != null) {
            String lower = raw.toLowerCase();
            if (lower.contains("id_number")) code = "ID_NUMBER_ALREADY_USED";
            else if (lower.contains("tax_code")) code = "TAX_CODE_ALREADY_USED";
            else if (lower.contains("user_id")) code = "APPLICATION_ALREADY_EXISTS";
        }
        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.CONFLICT.value())
                .message(mapBusinessMessage(code))
                .timestamp(LocalDateTime.now())
                .build();
        return new ResponseEntity<>(errorResponse, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(Exception ex) {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .build();
        return new ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private String mapBusinessMessage(String code) {
        if (code == null) return "Có lỗi xảy ra. Vui lòng thử lại.";
        switch (code) {
            case "ID_NUMBER_ALREADY_USED":
                return "Số CCCD này đã được sử dụng bởi tài khoản khác. Vui lòng kiểm tra lại.";
            case "TAX_CODE_ALREADY_USED":
                return "Mã số thuế này đã được sử dụng bởi tài khoản khác.";
            case "ID_NUMBER_BLACKLISTED":
                return "Số CCCD này không đủ điều kiện đăng ký bán hàng.";
            case "TAX_CODE_BLACKLISTED":
                return "Mã số thuế này không đủ điều kiện đăng ký bán hàng.";
            case "APPLICATION_ALREADY_EXISTS":
                return "Đơn đăng ký của bạn đang chờ duyệt hoặc đã được duyệt.";
            case "RESUBMIT_LIMIT_EXCEEDED":
                return "Bạn đã nộp lại quá số lần cho phép. Vui lòng liên hệ hỗ trợ.";
            case "INVALID_CCCD_IMAGE":
                return "Ảnh CCCD không hợp lệ, vui lòng nhập lại ảnh CCCD.";
            default:
                return code;
        }
    }
}
