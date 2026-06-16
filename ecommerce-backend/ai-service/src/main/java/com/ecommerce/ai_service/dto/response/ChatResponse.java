package com.ecommerce.ai_service.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse {
    private String conversationId;
    private String reply;
    private List<String> toolsUsed;
    private Map<String, Object> richData; // last tool's data for frontend rich rendering
}
