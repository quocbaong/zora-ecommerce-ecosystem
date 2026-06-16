package com.ecommerce.notification_service.dto.response;

import com.ecommerce.notification_service.entity.NotificationType;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NotificationResponse {
    private String id;
    private String userId;
    private NotificationType type;
    private String title;
    private String message;
    @JsonProperty("isRead")
    private boolean isRead;
    private LocalDateTime createdAt;
}
