package com.ecommerce.user_service.service;

import com.ecommerce.user_service.entity.BanAppeal;
import com.ecommerce.user_service.entity.BanAppealStatus;
import com.ecommerce.user_service.entity.User;
import com.ecommerce.user_service.exception.ResourceNotFoundException;
import com.ecommerce.user_service.repository.BanAppealRepository;
import com.ecommerce.user_service.repository.UserRepository;
import com.ecommerce.user_service.kafka.event.UserUnbannedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.List;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class BanAppealService {

    private final BanAppealRepository banAppealRepository;
    private final UserRepository userRepository;
    private final com.ecommerce.user_service.repository.UserWarningRepository userWarningRepository;
    private final RestTemplate restTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final JavaMailSender mailSender;

    @Value("${services.auth-url}")
    private String authServiceUrl;

    public BanAppeal createAppeal(String email, String reason, List<String> evidenceImages) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        // We allow the appeal to be created. The admin can verify if they are actually banned or not.
        // We only link warningId if there is a pending warning.
        boolean hasWarning = userWarningRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(user.getUserId(), "PENDING_APPEAL").isPresent()
                || userWarningRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(user.getUserId(), "APPEALING").isPresent();

        BanAppeal appeal = BanAppeal.builder()
                .email(email)
                .reason(reason)
                .status(BanAppealStatus.PENDING)
                .evidenceImages(evidenceImages != null ? evidenceImages : new ArrayList<>())
                .build();

        userWarningRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(user.getUserId(), "PENDING_APPEAL")
                .ifPresent(warning -> {
                    warning.setStatus("APPEALING");
                    userWarningRepository.save(warning);
                    appeal.setWarningId(warning.getId());
                });

        BanAppeal savedAppeal = banAppealRepository.save(appeal);

        try {
            kafkaTemplate.send("ban_appeal_submitted", com.ecommerce.user_service.kafka.event.BanAppealSubmittedEvent.builder()
                    .appealId(savedAppeal.getId())
                    .email(email)
                    .reason(reason)
                    .build());
            log.info("[KAFKA] Sent ban_appeal_submitted event for email: {}", email);
        } catch (Exception e) {
            log.error("Failed to send ban_appeal_submitted Kafka event: {}", e.getMessage());
        }

        return savedAppeal;
    }

    public BanAppeal getStatus(String email) {
        return banAppealRepository.findFirstByEmailOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new ResourceNotFoundException("No appeal found for email: " + email));
    }

    public Page<BanAppeal> listAppeals(Pageable pageable) {
        return banAppealRepository.findAll(pageable);
    }

    @Transactional
    public BanAppeal reviewAppeal(String id, BanAppealStatus status, String adminNote) {
        BanAppeal appeal = banAppealRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appeal not found: " + id));

        appeal.setStatus(status);
        appeal.setAdminNote(adminNote);

        if (appeal.getWarningId() != null) {
            userWarningRepository.findById(appeal.getWarningId()).ifPresent(warning -> {
                if (status == BanAppealStatus.APPROVED) {
                    warning.setStatus("APPEAL_APPROVED");
                    User user = userRepository.findByUserId(warning.getUserId()).orElse(null);
                    if (user != null) {
                        user.setWarningCount(Math.max(0, user.getWarningCount() - 1));
                        userRepository.save(user);
                    }
                    userWarningRepository.save(warning);
                    unbanUser(appeal.getEmail());
                } else if (status == BanAppealStatus.REJECTED) {
                    warning.setStatus("APPEAL_REJECTED");
                    userWarningRepository.save(warning);
                    applyPenalty(warning);
                }
            });
        } else {
            if (status == BanAppealStatus.APPROVED) {
                unbanUser(appeal.getEmail());
            }
        }
        
        sendDecisionEmail(appeal.getEmail(), status, null, adminNote);

        return banAppealRepository.save(appeal);
    }

    public void applyPenalty(com.ecommerce.user_service.entity.UserWarning w) {
        // Feature removed: no more auto-ban or auto-mute
    }

    private void sendChatBanEvent(String userId, java.time.LocalDateTime chatBanUntil) {
        kafkaTemplate.send("USER_CHAT_BANNED", java.util.Map.of("userId", userId, "chatBanUntil", chatBanUntil.toString()));
    }

    private void unbanUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        boolean needsSave = false;

        if ("BANNED".equalsIgnoreCase(user.getStatus())) {
            user.setStatus("ACTIVE");
            user.setStatusReason("Ban appeal approved");
            needsSave = true;
        }

        // Always call auth-service to unban, because auth-service is the source of truth for login bans
        // and user-service might be out of sync.
        try {
            restTemplate.put(authServiceUrl + "/auth/internal/users/" + user.getUserId() + "/unban", null);
        } catch (Exception e) {
            log.error("Failed to unban user {} in auth-service: {}", user.getUserId(), e.getMessage());
        }

        if (user.getChatBanUntil() != null) {
            user.setChatBanUntil(null);
            needsSave = true;
        }

        if (needsSave) {
            userRepository.save(user);
        }

        kafkaTemplate.send("user_unbanned", UserUnbannedEvent.builder()
                .userId(user.getUserId())
                .reason("Ban/Warning appeal approved")
                .build());
    }

    private void sendDecisionEmail(String email, BanAppealStatus status, Double fineAmount, String adminNote) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("ZORA - Kết quả kháng nghị khóa tài khoản");
            
            StringBuilder body = new StringBuilder();
            body.append("Chào bạn,\n\n");
            body.append("Đơn kháng nghị của bạn đã được Ban quản trị xem xét.\n");
            body.append("Kết quả: ").append(status.name()).append("\n\n");
            
            if (adminNote != null && !adminNote.isBlank()) {
                body.append("Ghi chú từ admin: ").append(adminNote).append("\n\n");
            }
            
            if (status == BanAppealStatus.APPROVED) {
                body.append("Tài khoản của bạn đã được mở khóa. Bạn có thể đăng nhập bình thường.\n\n");
            } else if (status == BanAppealStatus.REJECTED) {
                body.append("Rất tiếc, yêu cầu mở khóa của bạn không được chấp thuận.\n\n");
            }
            
            body.append("Trân trọng,\nZORA Admin");
            
            message.setText(body.toString());
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send decision email to {}: {}", email, e.getMessage());
        }
    }
}
