package com.ecommerce.ai_service.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HealthResponse {
    private boolean serviceUp;
    private boolean aiEnabled;
    private boolean historyEnabled;
    private boolean toolCallEnabled;
    private String model;
}
