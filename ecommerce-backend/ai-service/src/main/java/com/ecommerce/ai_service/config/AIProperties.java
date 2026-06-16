package com.ecommerce.ai_service.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "ai")
@Data
public class AIProperties {
    private boolean enabled = true;
    private boolean historyEnabled = true;
    private boolean toolCallEnabled = true;
    private int maxHistoryMessages = 10;
    private int maxMessageLength = 2000;
    private int maxRequestsPerDayPerUser = 50;
}
