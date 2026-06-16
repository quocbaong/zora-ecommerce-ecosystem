package com.ecommerce.auth_service.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String fullName;

    /**
     * Optional. Accepted values: USER, SELLER.
     * ADMIN cannot be set via API — only via direct DB update.
     * Defaults to USER if not provided.
     */
    @Pattern(regexp = "^(USER|SELLER)$", message = "Role must be USER or SELLER")
    private String role;
}
