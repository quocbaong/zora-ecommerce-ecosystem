package com.ecommerce.notification_service.service;

import com.ecommerce.notification_service.dto.request.NotificationRequest;
import com.ecommerce.notification_service.dto.response.NotificationResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface NotificationService {
    void createAndSaveNotification(NotificationRequest request);
    Page<NotificationResponse> getMyNotifications(String userId, Pageable pageable);
    long countUnread(String userId);
    void markAsRead(String id);
    void markAllAsRead(String userId);
}
