package com.ecommerce.notification_service.dto.request;

import com.ecommerce.notification_service.entity.NotificationType;
import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NotificationRequest {
    private String userId;
    private String email;
    private NotificationType type;
    private String title;
    private String message;
}
