package com.ecommerce.notification_service.controller;

import com.ecommerce.notification_service.dto.request.NotificationRequest;
import com.ecommerce.notification_service.dto.response.NotificationResponse;
import com.ecommerce.notification_service.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // Lấy danh sách thông báo của người dùng (có phân trang)
    // GET /notifications?page=0&size=20
    @GetMapping
    public ResponseEntity<Map<String, Object>> getMyNotifications(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<NotificationResponse> notificationPage = notificationService.getMyNotifications(userId, pageable);
        long unreadCount = notificationService.countUnread(userId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", notificationPage.getContent());
        response.put("totalPages", notificationPage.getTotalPages());
        response.put("totalElements", notificationPage.getTotalElements());
        response.put("unreadCount", unreadCount);
        return ResponseEntity.ok(response);
    }

    // Đánh dấu đã đọc
    // PUT /notifications/{id}/read
    @PutMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markAsRead(@PathVariable String id) {
        notificationService.markAsRead(id);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Đã đánh dấu đã đọc!");
        return ResponseEntity.ok(response);
    }

    // Đánh dấu tất cả đã đọc
    // PUT /notifications/read-all
    @PutMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsRead(
            @RequestHeader("X-User-Id") String userId) {
        notificationService.markAllAsRead(userId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Đã đánh dấu tất cả đã đọc!");
        return ResponseEntity.ok(response);
    }

    // Tạo thông báo thủ công (Admin/System dùng)
    // POST /notifications
    @PostMapping
    public ResponseEntity<Map<String, Object>> sendNotification(@RequestBody NotificationRequest request) {
        notificationService.createAndSaveNotification(request);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Thông báo đã được gửi!");
        return ResponseEntity.ok(response);
    }
}
