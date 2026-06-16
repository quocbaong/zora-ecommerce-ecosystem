package com.ecommerce.notification_service.kafka.consumer;

import com.ecommerce.notification_service.client.UserClient;
import com.ecommerce.notification_service.dto.request.NotificationRequest;
import com.ecommerce.notification_service.entity.NotificationType;
import com.ecommerce.notification_service.kafka.event.AdCampaignDecidedEvent;
import com.ecommerce.notification_service.kafka.event.OrderCreatedEvent;
import com.ecommerce.notification_service.kafka.event.OrderShippedEvent;
import com.ecommerce.notification_service.kafka.event.OrderStatusChangedEvent;
import com.ecommerce.notification_service.kafka.event.PaymentSuccessEvent;
import com.ecommerce.notification_service.kafka.event.ProductCreatedEvent;
import com.ecommerce.notification_service.kafka.event.SellerApplicationDecidedEvent;
import com.ecommerce.notification_service.kafka.event.UserBannedEvent;
import com.ecommerce.notification_service.kafka.event.UserUnbannedEvent;
import com.ecommerce.notification_service.kafka.event.UserWarnedEvent;
import com.ecommerce.notification_service.kafka.event.BanAppealSubmittedEvent;
import com.ecommerce.notification_service.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationListener {

    private final NotificationService notificationService;
    private final JavaMailSender mailSender;
    private final UserClient userClient;
    private final SimpMessagingTemplate messagingTemplate;

    // Lắng nghe sự kiện sản phẩm mới được đăng
    @KafkaListener(topics = "product_events", groupId = "notification-group")
    public void onProductCreated(ProductCreatedEvent event) {
        log.info("🛍️ [KAFKA] Nhận được sự kiện sản phẩm mới: {}", event.getName());
        notificationService.createAndSaveNotification(
                NotificationRequest.builder()
                        .userId(event.getSellerId())
                        .type(NotificationType.PRODUCT_CREATED)
                        .title("Sản phẩm đã đăng thành công!")
                        .message("Sản phẩm '" + event.getName() + "' của bạn đã được đăng lên sàn.")
                        .build()
        );
    }

    // Lắng nghe sự kiện tạo đơn hàng
    @KafkaListener(topics = "order_created", groupId = "notification-group")
    public void onOrderCreated(OrderCreatedEvent event) {
        log.info("📦 [KAFKA] Nhận được sự kiện đơn hàng mới: {}", event.getOrderId());
        String shortId = event.getOrderId().substring(0, 8).toUpperCase();
        
        // Notify Buyer
        notificationService.createAndSaveNotification(
                NotificationRequest.builder()
                        .userId(event.getUserId())
                        .type(NotificationType.ORDER_CREATED)
                        .title("Đặt hàng thành công!")
                        .message("Đơn hàng #" + shortId + " trị giá " + event.getTotalPrice() + " VND đã được tạo.")
                        .build()
        );
        sendStatusEmail(event.getUserId(), event.getOrderId(),
                "ZORA — Xác nhận đặt hàng thành công",
                "Đơn hàng #" + shortId + " trị giá " + event.getTotalPrice()
                        + " VND đã được tạo và đang chờ người bán xác nhận. Chúng tôi sẽ thông báo khi đơn hàng có cập nhật mới.");

        // Notify Seller
        if (event.getSellerId() != null) {
            notificationService.createAndSaveNotification(
                    NotificationRequest.builder()
                            .userId(event.getSellerId())
                            .type(NotificationType.SYSTEM_ALERT)
                            .title("Bạn có đơn đặt hàng mới!")
                            .message("Đơn hàng #" + shortId + " trị giá " + event.getTotalPrice() + " VND vừa được đặt. Hãy chuẩn bị hàng nhé!")
                            .build()
            );
            sendStatusEmail(event.getSellerId(), event.getOrderId(),
                    "ZORA — Bạn có đơn đặt hàng mới",
                    "Chúc mừng! Shop của bạn vừa nhận được đơn hàng mới #" + shortId + " trị giá " + event.getTotalPrice()
                            + " VND.\n\nVui lòng đăng nhập vào hệ thống để xác nhận và chuẩn bị hàng sớm nhất có thể.");
        }
    }

    // Lắng nghe sự kiện thanh toán thành công
    @KafkaListener(topics = "payment_success", groupId = "notification-group")
    public void onPaymentSuccess(PaymentSuccessEvent event) {
        log.info("💳 [KAFKA] Thanh toán thành công cho đơn: {}", event.getOrderId());
        notificationService.createAndSaveNotification(
                NotificationRequest.builder()
                        .userId(event.getUserId())
                        .type(NotificationType.PAYMENT_SUCCESS)
                        .title("Thanh toán thành công!")
                        .message("Đơn hàng #" + event.getOrderId() + " đã được thanh toán " + event.getAmount() + " VND qua " + event.getMethod() + ".")
                        .build()
        );
    }

    // Lắng nghe sự kiện seller cập nhật trạng thái đơn hàng
    @KafkaListener(topics = "order_update", groupId = "notification-group")
    public void onOrderStatusChanged(OrderStatusChangedEvent event) {
        log.info("📋 [KAFKA] Trạng thái đơn hàng thay đổi: {} -> {}", event.getOrderId(), event.getStatus());
        String shortId = event.getOrderId().substring(0, 8).toUpperCase();

        String buyerTitle = null, buyerMessage = null, buyerSubject = null, buyerBody = null;
        String sellerTitle = null, sellerMessage = null, sellerSubject = null, sellerBody = null;

        switch (event.getStatus()) {
            case "CONFIRMED" -> {
                buyerTitle = "Đơn hàng đã được xác nhận!";
                buyerMessage = "Người bán đã xác nhận đơn hàng #" + shortId + ". Đơn hàng đang được chuẩn bị.";
            }
            case "SHIPPING" -> {
                buyerTitle = "Đơn hàng đang được giao!";
                buyerMessage = "Đơn hàng #" + shortId + " đã được giao cho đơn vị vận chuyển.";
            }
            case "DELIVERED" -> {
                if (event.getNote() != null) {
                    buyerTitle = "Từ chối khiếu nại!";
                    buyerMessage = "Yêu cầu khiếu nại đơn #" + shortId + " bị từ chối. Lý do: " + event.getNote();
                    buyerSubject = "ZORA — Kết quả xử lý khiếu nại đơn hàng " + shortId;
                    buyerBody = "Chào bạn, Admin ZORA đã kiểm tra kỹ bằng chứng từ bạn và người bán. Rất tiếc, yêu cầu hoàn tiền của bạn không được chấp thuận vì lý do sau:\n\n"
                              + "\"" + event.getNote() + "\"\n\n"
                              + "Số tiền sẽ được thanh toán cho người bán. Nếu bạn có thắc mắc, vui lòng phản hồi lại email này.";

                    sellerTitle = "Khiếu nại bị từ chối!";
                    sellerMessage = "Admin đã từ chối yêu cầu hoàn tiền của khách cho đơn #" + shortId + ". Tiền sẽ được cộng vào ví của bạn.";
                } else {
                    buyerTitle = "Đơn hàng đã giao thành công!";
                    buyerMessage = "Đơn hàng #" + shortId + " đã được giao. Cảm ơn bạn đã mua hàng tại ZORA!";
                    buyerSubject = "ZORA — Đơn hàng đã giao thành công";
                    buyerBody = "Đơn hàng #" + shortId
                            + " của bạn đã được giao thành công. Hy vọng bạn hài lòng với sản phẩm. "
                            + "Đừng quên đánh giá để giúp shop và những người mua khác nhé!";

                    sellerTitle = "Giao hàng thành công!";
                    sellerMessage = "Đơn hàng #" + shortId + " đã được giao đến tay khách hàng.";
                    sellerSubject = "ZORA — Đơn hàng giao thành công";
                    sellerBody = "Đơn hàng #" + shortId + " của shop đã được giao thành công cho khách hàng.\n\n"
                            + "Tiền hàng sẽ được cộng vào Ví khả dụng (nếu khách không khiếu nại).";
                }
            }
            case "CANCELLED" -> {
                buyerTitle = "Đơn hàng đã bị hủy";
                buyerMessage = "Đơn hàng #" + shortId + " đã bị hủy.";
                
                sellerTitle = "Đơn hàng đã bị hủy";
                sellerMessage = "Đơn hàng #" + shortId + " của shop bạn đã bị hủy.";
            }
            case "DISPUTED" -> {
                buyerTitle = "Đã gửi yêu cầu khiếu nại";
                buyerMessage = "Yêu cầu khiếu nại đơn hàng #" + shortId + " đã được gửi đến Admin xử lý.";

                sellerTitle = "Khách hàng khiếu nại đơn hàng!";
                sellerMessage = "Khách hàng vừa khiếu nại đơn hàng #" + shortId + ". Vui lòng kiểm tra ngay!";
            }
            case "REFUNDED" -> {
                buyerTitle = "Khiếu nại thành công!";
                buyerMessage = "Yêu cầu hoàn tiền cho đơn hàng #" + shortId + " đã được ZORA chấp thuận.";
                buyerSubject = "ZORA — Chấp thuận hoàn tiền đơn hàng " + shortId;
                buyerBody = "Chào bạn, sau khi xem xét bằng chứng, ZORA quyết định đồng ý với khiếu nại của bạn.\n\n"
                          + "Số tiền sẽ được hoàn về tài khoản/ví của bạn trong thời gian sớm nhất. Cảm ơn bạn đã đồng hành cùng chúng tôi!";
                
                sellerTitle = "Chấp thuận khiếu nại!";
                sellerMessage = "Admin đã đồng ý hoàn tiền cho đơn hàng #" + shortId + " theo yêu cầu của khách hàng.";
            }
            default -> { return; }
        }

        // Notify Buyer
        if (buyerTitle != null) {
            notificationService.createAndSaveNotification(
                    NotificationRequest.builder()
                            .userId(event.getUserId())
                            .type(NotificationType.ORDER_STATUS_UPDATED)
                            .title(buyerTitle)
                            .message(buyerMessage)
                            .build()
            );
            if (buyerSubject != null && buyerBody != null) {
                sendStatusEmail(event.getUserId(), event.getOrderId(), buyerSubject, buyerBody);
            }
        }

        // Notify Seller
        if (sellerTitle != null && event.getSellerId() != null) {
            notificationService.createAndSaveNotification(
                    NotificationRequest.builder()
                            .userId(event.getSellerId())
                            .type(NotificationType.SYSTEM_ALERT)
                            .title(sellerTitle)
                            .message(sellerMessage)
                            .build()
            );
            if (sellerSubject != null && sellerBody != null) {
                sendStatusEmail(event.getSellerId(), event.getOrderId(), sellerSubject, sellerBody);
            }
        }
    }

    private void sendStatusEmail(String userId, String orderId, String subject, String body) {
        UserClient.UserInfo user = userClient.getById(userId);
        if (user == null || user.email() == null) {
            log.warn("Không gửi được email cho đơn {}: không tìm thấy email user {}", orderId, userId);
            return;
        }
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(user.email());
            mail.setSubject(subject);
            mail.setText("Xin chào " + (user.fullName() != null ? user.fullName() : "bạn") + ",\n\n"
                    + body + "\n\n"
                    + "Bạn có thể theo dõi đơn hàng tại mục \"Đơn hàng của tôi\" trên ZORA.\n\n"
                    + "Cảm ơn bạn đã mua sắm tại ZORA!\n\nTrân trọng,\nĐội ngũ ZORA");
            mailSender.send(mail);
            log.info("[EMAIL] Đã gửi email \"{}\" cho đơn {} tới {}", subject, orderId, user.email());
        } catch (Exception e) {
            log.error("[EMAIL] Gửi email cho đơn {} thất bại: {}", orderId, e.getMessage());
        }
    }

    // Lắng nghe sự kiện đơn hàng được giao đi
    @KafkaListener(topics = "order_shipped", groupId = "notification-group")
    public void onOrderShipped(OrderShippedEvent event) {
        log.info("🚚 [KAFKA] Đơn hàng đang giao: {}", event.getOrderId());
        notificationService.createAndSaveNotification(
                NotificationRequest.builder()
                        .userId(event.getUserId())
                        .type(NotificationType.ORDER_SHIPPED)
                        .title("Đơn hàng đang được giao!")
                        .message("Đơn hàng #" + event.getOrderId() +
                                " đang được giao bởi " + event.getCarrier() +
                                ". Mã vận đơn: " + event.getShippingCode())
                        .build()
        );
    }

    @KafkaListener(topics = "seller_application_decided", groupId = "notification-group")
    public void onSellerApplicationDecided(SellerApplicationDecidedEvent event) {
        log.info("[KAFKA] Seller application decided: userId={} status={}", event.getUserId(), event.getStatus());
        boolean approved = "APPROVED".equals(event.getStatus());
        notificationService.createAndSaveNotification(
                NotificationRequest.builder()
                        .userId(event.getUserId())
                        .type(approved
                                ? NotificationType.SELLER_APPLICATION_APPROVED
                                : NotificationType.SELLER_APPLICATION_REJECTED)
                        .title(approved
                                ? "Đơn đăng ký Seller đã được duyệt!"
                                : "Đơn đăng ký Seller chưa được chấp thuận")
                        .message(approved
                                ? "Shop \"" + event.getShopName() + "\" của bạn đã được duyệt. Bắt đầu đăng sản phẩm ngay!"
                                : "Đơn đăng ký shop \"" + event.getShopName() + "\" bị từ chối. Lý do: "
                                        + (event.getReason() != null ? event.getReason() : "Không đáp ứng yêu cầu"))
                        .build()
        );
    }

    @KafkaListener(topics = "ad_campaign_decided", groupId = "notification-group")
    public void onAdCampaignDecided(AdCampaignDecidedEvent event) {
        log.info("[KAFKA] AdCampaign {} → {}", event.getCampaignId(), event.getStatus());

        String status = event.getStatus();
        boolean approved = "APPROVED".equals(status);
        boolean forceStopped = "FORCE_STOPPED".equals(status);

        String title;
        String msg;
        NotificationType notifType;
        String emailSubject;
        String emailBody;

        if (approved) {
            title = "Chiến dịch quảng cáo đã được duyệt!";
            msg = "Banner \"" + event.getTitle() + "\" của bạn đã được duyệt và đang hiển thị trên trang chủ.";
            notifType = NotificationType.AD_CAMPAIGN_APPROVED;
            emailSubject = "ZORA — Chiến dịch quảng cáo đã được duyệt";
            emailBody = "Chiến dịch banner \"" + event.getTitle() + "\" của bạn đã được duyệt. "
                    + "Banner sẽ hiển thị trên trang chủ ZORA trong khoảng thời gian đã đăng ký.";
        } else if (forceStopped) {
            title = "Chiến dịch quảng cáo bị buộc dừng";
            msg = "Banner \"" + event.getTitle() + "\" đã bị Admin dừng ngay lập tức."
                    + (event.getReason() != null ? " Lý do: " + event.getReason() : "");
            notifType = NotificationType.AD_CAMPAIGN_REJECTED;
            emailSubject = "ZORA — Chiến dịch quảng cáo bị buộc dừng";
            emailBody = "Chiến dịch banner \"" + event.getTitle() + "\" của bạn đã bị Admin dừng ngay lập tức và không còn hiển thị trên trang chủ."
                    + (event.getReason() != null ? "\nLý do: " + event.getReason() : "")
                    + "\n\nNếu bạn có thắc mắc, vui lòng liên hệ bộ phận hỗ trợ của ZORA.";
        } else {
            title = "Chiến dịch quảng cáo bị từ chối";
            msg = "Banner \"" + event.getTitle() + "\" bị từ chối."
                    + (event.getReason() != null ? " Lý do: " + event.getReason() : "");
            notifType = NotificationType.AD_CAMPAIGN_REJECTED;
            emailSubject = "ZORA — Chiến dịch quảng cáo bị từ chối";
            emailBody = "Chiến dịch banner \"" + event.getTitle() + "\" của bạn không được duyệt."
                    + (event.getReason() != null ? "\nLý do: " + event.getReason() : "")
                    + "\n\nBạn có thể chỉnh sửa nội dung và gửi lại chiến dịch khác.";
        }

        notificationService.createAndSaveNotification(
                NotificationRequest.builder()
                        .userId(event.getSellerId())
                        .type(notifType)
                        .title(title)
                        .message(msg)
                        .build()
        );

        sendStatusEmail(event.getSellerId(), event.getCampaignId(), emailSubject, emailBody);
    }

    @KafkaListener(topics = "user_banned", groupId = "notification-group")
    public void onUserBanned(UserBannedEvent event) {
        log.info("[KAFKA] User banned: userId={} email={}", event.getUserId(), event.getEmail());

        // 1. In-app notification (also pushes via STOMP WebSocket)
        notificationService.createAndSaveNotification(
                NotificationRequest.builder()
                        .userId(event.getUserId())
                        .type(NotificationType.ACCOUNT_BANNED)
                        .title("Tài khoản của bạn đã bị khóa")
                        .message("Quản trị viên đã khóa tài khoản của bạn."
                                + (event.getReason() != null ? " Lý do: " + event.getReason() : ""))
                        .build()
        );

        // 2. Email notification
        if (event.getEmail() != null) {
            try {
                SimpleMailMessage mail = new SimpleMailMessage();
                mail.setTo(event.getEmail());
                mail.setSubject("ZORA — Tài khoản của bạn đã bị khóa");
                mail.setText("Xin chào " + (event.getName() != null ? event.getName() : "bạn") + ",\n\n"
                        + "Tài khoản ZORA của bạn đã bị khóa bởi quản trị viên.\n"
                        + (event.getReason() != null ? "Lý do: " + event.getReason() + "\n" : "")
                        + "\nNếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ support@zora.vn.\n\n"
                        + "Trân trọng,\nĐội ngũ ZORA");
                mailSender.send(mail);
                log.info("[EMAIL] Ban notification sent to {}", event.getEmail());
            } catch (Exception e) {
                log.error("[EMAIL] Failed to send ban email to {}: {}", event.getEmail(), e.getMessage());
            }
        }
    }

    @KafkaListener(topics = "user_warned", groupId = "notification-group")
    public void onUserWarned(com.ecommerce.notification_service.kafka.event.UserWarnedEvent event) {
        log.info("[KAFKA] User warned: userId={} email={} warningNumber={}", event.getUserId(), event.getEmail(), event.getWarningNumber());

        // 1. In-app notification - Vô hiệu hóa theo yêu cầu: Cảnh cáo chỉ gửi về email, không hiện in-app
        /*
        notificationService.createAndSaveNotification(
                NotificationRequest.builder()
                        .userId(event.getUserId())
                        .type(NotificationType.USER_WARNED)
                        .title("Cảnh cáo vi phạm (Lần " + event.getWarningNumber() + ")")
                        .message("Tài khoản của bạn nhận được cảnh cáo do vi phạm. Bạn có 3 ngày để gửi đơn kháng nghị nếu đây là sự nhầm lẫn. Lý do: " + (event.getReason() != null ? event.getReason() : ""))
                        .build()
        );
        */

        // 2. Email notification
        if (event.getEmail() != null) {
            try {
                SimpleMailMessage mail = new SimpleMailMessage();
                mail.setTo(event.getEmail());
                mail.setSubject("ZORA — Cảnh cáo vi phạm tài khoản (Lần " + event.getWarningNumber() + ")");
                mail.setText("Xin chào " + (event.getName() != null ? event.getName() : "bạn") + ",\n\n"
                        + "Tài khoản ZORA của bạn đã nhận một cảnh cáo do vi phạm tiêu chuẩn cộng đồng.\n"
                        + (event.getReason() != null ? "Lý do: " + event.getReason() + "\n\n" : "\n")
                        + "Bạn có 3 ngày để gửi đơn kháng nghị tại trang Hồ sơ cá nhân nếu đây là sự nhầm lẫn.\n\n"
                        + "Trân trọng,\nĐội ngũ ZORA");
                mailSender.send(mail);
                log.info("[EMAIL] Warning notification sent to {}", event.getEmail());
            } catch (Exception e) {
                log.error("[EMAIL] Failed to send warning email to {}: {}", event.getEmail(), e.getMessage());
            }
        }
    }
    @KafkaListener(topics = "user_unbanned", groupId = "notification-group")
    public void onUserUnbanned(com.ecommerce.notification_service.kafka.event.UserUnbannedEvent event) {
        log.info("[KAFKA] User unbanned: userId={}", event.getUserId());

        // Get email of the user first
        String email = null;
        UserClient.UserInfo user = null;
        try {
            user = userClient.getById(event.getUserId());
            if (user != null) {
                email = user.email();
            }
        } catch (Exception e) {
            log.error("Failed to fetch user info for unban: {}", e.getMessage());
        }

        // 1. In-app notification
        notificationService.createAndSaveNotification(
                NotificationRequest.builder()
                        .userId(event.getUserId())
                        .email(email) // Pass email so we can push to email topic!
                        .type(NotificationType.SYSTEM_ALERT)
                        .title("Tài khoản đã được mở khóa")
                        .message("Tài khoản của bạn đã được mở khóa. Bạn có thể tiếp tục sử dụng dịch vụ."
                                + (event.getReason() != null ? " Lý do: " + event.getReason() : ""))
                        .build()
        );

        // 2. Email notification
        if (user != null && user.email() != null) {
            try {
                SimpleMailMessage mail = new SimpleMailMessage();
                mail.setTo(user.email());
                mail.setSubject("ZORA — Tài khoản của bạn đã được mở khóa");
                mail.setText("Xin chào " + (user.fullName() != null ? user.fullName() : "bạn") + ",\n\n"
                        + "Tài khoản ZORA của bạn đã được mở khóa.\n"
                        + (event.getReason() != null ? "Lý do: " + event.getReason() + "\n" : "")
                        + "\nBạn có thể đăng nhập và tiếp tục sử dụng dịch vụ bình thường.\n\n"
                        + "Trân trọng,\nĐội ngũ ZORA");
                mailSender.send(mail);
                log.info("[EMAIL] Unban notification sent to {}", user.email());
            } catch (Exception e) {
                log.error("[EMAIL] Failed to send unban email to {}: {}", user.email(), e.getMessage());
            }
        }
    }

    @KafkaListener(topics = "ban_appeal_submitted", groupId = "notification-group")
    public void onBanAppealSubmitted(com.ecommerce.notification_service.kafka.event.BanAppealSubmittedEvent event) {
        log.info("[KAFKA] Ban appeal submitted: email={} reason={}", event.getEmail(), event.getReason());

        com.ecommerce.notification_service.dto.response.NotificationResponse response = 
            com.ecommerce.notification_service.dto.response.NotificationResponse.builder()
                .id("appeal-" + event.getAppealId())
                .type(NotificationType.SYSTEM_ALERT)
                .title("Đơn kháng nghị mới")
                .message("Tài khoản " + event.getEmail() + " đã gửi đơn kháng nghị mới: " + event.getReason())
                .isRead(false)
                .createdAt(java.time.LocalDateTime.now())
                .build();

        messagingTemplate.convertAndSend("/topic/notifications/admin", response);
        log.info("🔔 [WS] Pushed admin notification for appeal to /topic/notifications/admin");
    }

}
