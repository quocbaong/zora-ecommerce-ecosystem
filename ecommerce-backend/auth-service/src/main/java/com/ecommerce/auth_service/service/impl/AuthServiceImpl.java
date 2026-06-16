package com.ecommerce.auth_service.service.impl;

import com.ecommerce.auth_service.dto.request.ChangePasswordRequest;
import com.ecommerce.auth_service.dto.request.ForgotPasswordRequest;
import com.ecommerce.auth_service.dto.request.LoginRequest;
import com.ecommerce.auth_service.dto.request.RefreshTokenRequest;
import com.ecommerce.auth_service.dto.request.RegisterRequest;
import com.ecommerce.auth_service.dto.request.ResetPasswordRequest;
import com.ecommerce.auth_service.dto.response.AuthResponse;
import com.ecommerce.auth_service.dto.response.UserResponse;
import com.ecommerce.auth_service.entity.RefreshToken;
import com.ecommerce.auth_service.entity.User;
import com.ecommerce.auth_service.entity.UserProfile;
import com.ecommerce.auth_service.repository.RefreshTokenRepository;
import com.ecommerce.auth_service.repository.UserProfileRepository;
import com.ecommerce.auth_service.repository.UserRepository;
import com.ecommerce.auth_service.service.AuthService;
import com.ecommerce.auth_service.service.EmailService;
import com.ecommerce.auth_service.service.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final StringRedisTemplate redisTemplate;
    private final EmailService emailService;

    @Override
    @Transactional
    public void register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("EMAIL_ALREADY_EXISTS");
        }

        String role = (request.getRole() != null) ? request.getRole() : "USER";

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .isEmailVerified(false)
                .build();
        User savedUser = userRepository.save(user);

        UserProfile profile = UserProfile.builder()
                .user(savedUser)
                .fullName(request.getFullName())
                .build();
        userProfileRepository.save(profile);

        // Generate 6-digit verification code
        String code = String.format("%06d", new java.security.SecureRandom().nextInt(1000000));

        // Save to Redis with 15 minutes expiration
        redisTemplate.opsForValue().set(
                "verify-email:" + savedUser.getEmail(), 
                code, 
                15, 
                TimeUnit.MINUTES
        );
        
        // Send email
        emailService.sendVerificationEmail(savedUser.getEmail(), code);

        log.info("User registered successfully: {} with role: {}, verification code sent", savedUser.getEmail(), role);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("USER_NOT_FOUND"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            log.warn("Login failed for user: {}", request.getEmail());
            throw new RuntimeException("INVALID_PASSWORD");
        }

        if ("BANNED".equals(user.getStatus())) {
            if (user.getBannedUntil() != null && user.getBannedUntil().isBefore(LocalDateTime.now())) {
                user.setStatus("ACTIVE");
                user.setBannedUntil(null);
                userRepository.save(user);
                redisTemplate.delete("banned:" + user.getId());
                log.info("Ban expired for user: {}, status set to ACTIVE", user.getEmail());
            } else {
                log.warn("Login blocked for banned user: {}", request.getEmail());
                if (user.getBannedUntil() != null) {
                    throw new RuntimeException("ACCOUNT_BANNED_UNTIL_" + user.getBannedUntil().toString());
                } else {
                    throw new RuntimeException("ACCOUNT_BANNED");
                }
            }
        }

        if (!user.isEmailVerified()) {
            log.warn("Login blocked for unverified email: {}", request.getEmail());
            throw new RuntimeException("EMAIL_NOT_VERIFIED");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshTokenString = jwtService.generateRefreshToken(user);

        // Save refresh token to DB
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(refreshTokenString)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .build();
        // Remove old tokens
        refreshTokenRepository.deleteByUser(user);
        refreshTokenRepository.save(refreshToken);

        log.info("User logged in successfully: {}", user.getEmail());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenString)
                .user(UserResponse.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .role(user.getRole())
                        .build())
                .build();
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String requestToken = request.getRefreshToken();

        // Kiểm tra refresh token có trong blacklist không (trường hợp user đã logout)
        Boolean isBlacklisted = redisTemplate.hasKey("blacklist:" + requestToken);
        if (Boolean.TRUE.equals(isBlacklisted)) {
            throw new RuntimeException("TOKEN_REVOKED");
        }

        RefreshToken refreshToken = refreshTokenRepository.findByToken(requestToken)
                .orElseThrow(() -> new RuntimeException("TOKEN_EXPIRED"));

        if (refreshToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(refreshToken);
            throw new RuntimeException("TOKEN_EXPIRED");
        }

        User user = refreshToken.getUser();

        if ("BANNED".equals(user.getStatus())) {
            log.warn("Refresh blocked for banned user: {}", user.getEmail());
            refreshTokenRepository.delete(refreshToken);
            throw new RuntimeException("ACCOUNT_BANNED");
        }

        String newAccessToken = jwtService.generateAccessToken(user);

        log.info("Refresh token generated for user: {}", user.getEmail());

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(requestToken) // Return the same refresh token
                .user(UserResponse.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .role(user.getRole())
                        .build())
                .build();
    }

    @Override
    public void logout(String accessToken) {
        if (accessToken.startsWith("Bearer ")) {
            accessToken = accessToken.substring(7);
        }

        if (!jwtService.validateToken(accessToken)) {
            // Token đã hết hạn hoặc không hợp lệ — không cần blacklist
            return;
        }

        long expirationTime = jwtService.getAccessExpiration();
        redisTemplate.opsForValue().set(
                "blacklist:" + accessToken,
                "true",
                expirationTime,
                TimeUnit.MILLISECONDS
        );

        // Xóa refresh token khỏi DB để ngăn dùng lại sau logout
        try {
            String userId = jwtService.extractUserId(accessToken);
            userRepository.findById(userId).ifPresent(user -> {
                refreshTokenRepository.deleteByUser(user);
                log.info("Refresh tokens deleted for user: {}", userId);
            });
        } catch (Exception e) {
            log.warn("Could not delete refresh tokens on logout: {}", e.getMessage());
        }

        log.info("Access token added to blacklist");
    }

    @Override
    @Transactional
    public void verifyEmail(String email, String code) {
        String storedCode = redisTemplate.opsForValue().get("verify-email:" + email);
        if (storedCode == null || !storedCode.equals(code)) {
            throw new RuntimeException("INVALID_VERIFICATION_CODE");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("USER_NOT_FOUND"));
        
        user.setEmailVerified(true);
        userRepository.save(user);
        
        redisTemplate.delete("verify-email:" + email);
        log.info("Email verified successfully for user: {}", email);
    }

    @Override
    @Transactional
    public void resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("USER_NOT_FOUND"));

        if (user.isEmailVerified()) {
            throw new RuntimeException("EMAIL_ALREADY_VERIFIED");
        }

        String code = String.format("%06d", new java.security.SecureRandom().nextInt(1000000));
        redisTemplate.opsForValue().set("verify-email:" + email, code, 15, TimeUnit.MINUTES);
        emailService.sendVerificationEmail(email, code);
        log.info("Resent verification email to {}", email);
    }

    @Override
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail();
        // Không tiết lộ user có tồn tại hay không nếu email không có trong hệ thống
        if (!userRepository.existsByEmail(email)) {
            return;
        }

        String otp = String.format("%06d", new java.security.SecureRandom().nextInt(1000000));
        redisTemplate.opsForValue().set("forgot-pwd:" + email, otp, 10, TimeUnit.MINUTES);
        emailService.sendPasswordResetEmail(email, otp);
        log.info("Password reset OTP sent to {}", email);
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String storedOtp = redisTemplate.opsForValue().get("forgot-pwd:" + request.getEmail());
        if (storedOtp == null) {
            throw new RuntimeException("OTP_EXPIRED");
        }
        if (!storedOtp.equals(request.getOtp())) {
            throw new RuntimeException("INVALID_OTP");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("USER_NOT_FOUND"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        redisTemplate.delete("forgot-pwd:" + request.getEmail());
        log.info("Password reset successfully for {}", request.getEmail());
    }

    @Override
    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("USER_NOT_FOUND"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("INVALID_PASSWORD");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
