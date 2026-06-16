package com.ecommerce.auth_service.service;

import com.ecommerce.auth_service.dto.request.ChangePasswordRequest;
import com.ecommerce.auth_service.dto.request.ForgotPasswordRequest;
import com.ecommerce.auth_service.dto.request.LoginRequest;
import com.ecommerce.auth_service.dto.request.RefreshTokenRequest;
import com.ecommerce.auth_service.dto.request.RegisterRequest;
import com.ecommerce.auth_service.dto.request.ResetPasswordRequest;
import com.ecommerce.auth_service.dto.response.AuthResponse;

public interface AuthService {
    void register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse refreshToken(RefreshTokenRequest request);
    void logout(String token);
    void verifyEmail(String email, String code);
    void resendVerificationEmail(String email);
    void forgotPassword(ForgotPasswordRequest request);
    void resetPassword(ResetPasswordRequest request);
    void changePassword(String userId, ChangePasswordRequest request);
}
