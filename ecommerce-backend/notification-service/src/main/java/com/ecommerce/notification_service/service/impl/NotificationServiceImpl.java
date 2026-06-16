package com.ecommerce.notification_service.service.impl;

import com.ecommerce.notification_service.dto.request.NotificationRequest;
import com.ecommerce.notification_service.dto.response.NotificationResponse;
import com.ecommerce.notification_service.entity.Notification;
import com.ecommerce.notification_service.repository.NotificationRepository;
import com.ecommerce.notification_service.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final JavaMailSender javaMailSender;

    @Override
    public void createAndSaveNotification(NotificationRequest request) {
        Notification notification = Notification.builder()
                .userId(request.getUserId())
                .type(request.getType())
                .title(request.getTitle())
                .message(request.getMessage())
                .isRead(false)
                .build();
        notificationRepository.save(notification);
        
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            try {
                SimpleMailMessage mailMessage = new SimpleMailMessage();
                mailMessage.setTo(request.getEmail());
                mailMessage.setSubject(request.getTitle());
                mailMessage.setText(request.getMessage());
                javaMailSender.send(mailMessage);
                log.info("📧 Email sent successfully to {}", request.getEmail());
            } catch (MailException e) {
                log.error("Failed to send email to {}", request.getEmail(), e.getMessage());
            } catch (Exception e) {
                log.error("Unexpected error while sending email to {}", request.getEmail(), e.getMessage());
            }
        } else {
            log.info("📧 [EMAIL MOCK] To: {} | Subject: {} | Body: {}",
                    request.getUserId(), request.getTitle(), request.getMessage());
        }

        // Push real-time notification qua WebSocket
        messagingTemplate.convertAndSend(
                "/topic/notifications/" + request.getUserId(),
                toResponse(notification)
        );
        log.info("🔔 [WS] Pushed notification to /topic/notifications/{}", request.getUserId());

        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            messagingTemplate.convertAndSend(
                    "/topic/notifications/email/" + request.getEmail().trim(),
                    toResponse(notification)
            );
            log.info("🔔 [WS] Pushed notification to /topic/notifications/email/{}", request.getEmail().trim());
        }
    }

    @Override
    public Page<NotificationResponse> getMyNotifications(String userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    @Override
    public long countUnread(String userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Override
    public void markAsRead(String id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông báo!"));
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Override
    public void markAllAsRead(String userId) {
        java.util.List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalse(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
        log.info("Marked {} notifications as read for user {}", unread.size(), userId);
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId()).userId(n.getUserId()).type(n.getType())
                .title(n.getTitle()).message(n.getMessage())
                .isRead(n.isRead()).createdAt(n.getCreatedAt()).build();
    }
}
