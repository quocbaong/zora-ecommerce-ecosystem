package com.ecommerce.auth_service.controller;

import com.ecommerce.auth_service.dto.request.ChangePasswordRequest;
import com.ecommerce.auth_service.dto.request.ForgotPasswordRequest;
import com.ecommerce.auth_service.dto.request.LoginRequest;
import com.ecommerce.auth_service.dto.request.RefreshTokenRequest;
import com.ecommerce.auth_service.dto.request.RegisterRequest;
import com.ecommerce.auth_service.dto.request.ResetPasswordRequest;
import com.ecommerce.auth_service.dto.response.AuthResponse;
import com.ecommerce.auth_service.repository.UserRepository;
import com.ecommerce.auth_service.service.AuthService;
import com.ecommerce.auth_service.service.JwtService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<java.util.Map<String, String>> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(java.util.Map.of(
                "email", request.getEmail(),
                "message", "User registered successfully. Please check your email for the verification code."
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(@RequestHeader(value = "Authorization", required = false) String token) {
        if (token != null) {
            authService.logout(token);
        }
        return ResponseEntity.ok("Logged out successfully");
    }

    @PostMapping("/verify-email")
    public ResponseEntity<String> verifyEmail(@RequestParam String email, @RequestParam String code) {
        authService.verifyEmail(email, code);
        return ResponseEntity.ok("Email verified successfully");
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<String> resendVerification(@RequestParam String email) {
        authService.resendVerificationEmail(email);
        return ResponseEntity.ok("Verification email resent");
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok("If this email exists, an OTP has been sent");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok("Password reset successfully");
    }

    /** Internal service-to-service endpoint: look up a user's ID by email. */
    @GetMapping("/internal/user-by-email")
    public ResponseEntity<java.util.Map<String, String>> getUserByEmail(@RequestParam String email) {
        return userRepository.findByEmail(email)
                .map(u -> ResponseEntity.ok(java.util.Map.of("id", u.getId(), "email", u.getEmail())))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    /** Internal service-to-service endpoint: look up a user's email by ID. */
    @GetMapping("/internal/user-by-id/{id}")
    public ResponseEntity<java.util.Map<String, Object>> getUserById(@PathVariable String id) {
        return userRepository.findById(id)
                .map(u -> ResponseEntity.ok(java.util.Map.<String, Object>of(
                        "id", u.getId(),
                        "email", u.getEmail(),
                        "emailVerified", u.isEmailVerified()
                )))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    @PutMapping("/password")
    public ResponseEntity<String> changePassword(
            @RequestHeader(value = "Authorization") String token,
            @Valid @RequestBody ChangePasswordRequest request) {

        
        // Since Gateway doesn't validate token on /api/auth/**, we manually extract userId here
        String jwt = token.startsWith("Bearer ") ? token.substring(7) : token;
        if (!jwtService.validateToken(jwt)) {
            throw new RuntimeException("INVALID_TOKEN");
        }
        String userId = jwtService.extractUserId(jwt);
        authService.changePassword(userId, request);
        return ResponseEntity.ok("Password changed successfully");
    }
}
