package com.ecommerce.user_service.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SellerEmailService {

    private final JavaMailSender mailSender;

    public void sendApprovedEmail(String toEmail, String shopName) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(toEmail);
            msg.setSubject("ZORA - Đơn đăng ký Seller đã được duyệt!");
            msg.setText("Xin chào,\n\n"
                    + "Chúc mừng! Đơn đăng ký mở shop \"" + shopName + "\" của bạn đã được ZORA duyệt.\n\n"
                    + "Bạn có thể đăng nhập và bắt đầu đăng sản phẩm ngay bây giờ.\n\n"
                    + "Trân trọng,\nZORA Team");
            mailSender.send(msg);
            log.info("[EMAIL] Sent seller approved email to {}", toEmail);
        } catch (Exception e) {
            log.error("[EMAIL] Failed to send seller approved email to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendRejectedEmail(String toEmail, String shopName, String reason) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(toEmail);
            msg.setSubject("ZORA - Đơn đăng ký Seller chưa được chấp thuận");
            msg.setText("Xin chào,\n\n"
                    + "Rất tiếc, đơn đăng ký mở shop \"" + shopName + "\" của bạn chưa được chấp thuận.\n\n"
                    + "Lý do: " + (reason != null ? reason : "Không đáp ứng yêu cầu") + "\n\n"
                    + "Bạn có thể chỉnh sửa và nộp lại đơn (tối đa 3 lần).\n\n"
                    + "Trân trọng,\nZORA Team");
            mailSender.send(msg);
            log.info("[EMAIL] Sent seller rejected email to {}", toEmail);
        } catch (Exception e) {
            log.error("[EMAIL] Failed to send seller rejected email to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendRoleChangedToSellerEmail(String toEmail, String name) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(toEmail);
            msg.setSubject("ZORA - Tài khoản của bạn đã được nâng cấp lên Seller");
            msg.setText("Xin chào " + (name != null ? name : "") + ",\n\n"
                    + "Tài khoản ZORA của bạn vừa được Admin nâng cấp lên vai trò Seller.\n\n"
                    + "Bạn có thể đăng nhập lại và bắt đầu quản lý shop, đăng sản phẩm ngay bây giờ.\n\n"
                    + "Trân trọng,\nZORA Team");
            mailSender.send(msg);
            log.info("[EMAIL] Sent role-changed-to-seller email to {}", toEmail);
        } catch (Exception e) {
            log.error("[EMAIL] Failed to send role-changed-to-seller email to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendBankOtpEmail(String toEmail, String otp) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(toEmail);
            msg.setSubject("ZORA - OTP Xác Nhận Thêm Tài Khoản Ngân Hàng");
            msg.setText("Xin chào,\n\n"
                    + "Mã OTP để xác nhận thêm tài khoản ngân hàng của bạn là: " + otp + "\n\n"
                    + "Mã này có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.\n\n"
                    + "Trân trọng,\nZORA Team");
            mailSender.send(msg);
            log.info("[EMAIL] Sent bank OTP email to {}", toEmail);
        } catch (Exception e) {
            log.error("[EMAIL] Failed to send bank OTP email to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendCreditCardOtpEmail(String toEmail, String otp) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(toEmail);
            msg.setSubject("ZORA - OTP Xác Nhận Thêm Thẻ Tín Dụng/Ghi Nợ");
            msg.setText("Xin chào,\n\n"
                    + "Mã OTP để xác nhận thêm thẻ tín dụng/ghi nợ của bạn là: " + otp + "\n\n"
                    + "Mã này có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.\n\n"
                    + "Trân trọng,\nZORA Team");
            mailSender.send(msg);
            log.info("[EMAIL] Sent credit card OTP email to {}", toEmail);
        } catch (Exception e) {
            log.error("[EMAIL] Failed to send credit card OTP email to {}: {}", toEmail, e.getMessage());
        }
    }
}
