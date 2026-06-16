package com.ecommerce.ai_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChatRequest {

    @NotBlank(message = "message không được để trống")
    @Size(max = 2000, message = "message không quá 2000 ký tự")
    private String message;

    private String conversationId; // null = new conversation

    private String requestId; // optional UUID for idempotency — same requestId returns cached response
}
