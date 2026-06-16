package com.ecommerce.auth_service.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender javaMailSender;

    public void sendPasswordResetEmail(String toEmail, String code) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("ZORA - Reset Password OTP");
            message.setText("Dear user,\n\n" +
                    "You requested to reset your password.\n" +
                    "Your OTP code is: " + code + "\n\n" +
                    "This code will expire in 10 minutes.\n" +
                    "If you did not request this, please ignore this email.\n\n" +
                    "Best regards,\n" +
                    "ZORA Team");

            javaMailSender.send(message);
            log.info("Password reset email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset email to {}", toEmail, e);
            throw new RuntimeException("FAILED_TO_SEND_EMAIL");
        }
    }

    public void sendVerificationEmail(String toEmail, String code) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("ZORA - Email Verification Code");
            message.setText("Dear user,\n\n" +
                    "Your verification code is: " + code + "\n\n" +
                    "This code will expire in 15 minutes.\n\n" +
                    "Best regards,\n" +
                    "ZORA Team");

            javaMailSender.send(message);
            log.info("Verification email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}", toEmail, e);
            throw new RuntimeException("FAILED_TO_SEND_EMAIL");
        }
    }
}
