package com.ecommerce.ai_service.dto.tool;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class ToolResult {
    private boolean success;
    private Map<String, Object> data;

    public static ToolResult ok(Map<String, Object> data) {
        return ToolResult.builder().success(true).data(data).build();
    }

    public static ToolResult error(String message) {
        return ToolResult.builder()
                .success(false)
                .data(Map.of("error", message))
                .build();
    }
}
