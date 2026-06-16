package com.ecommerce.user_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    // auth user ID (FK to users.id in auth-service)
    @Column(name = "user_id", unique = true, nullable = false)
    private String userId;

    @Column(name = "full_name")
    private String name;

    @Column(name = "phone")
    private String phone;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "email", unique = true)
    private String email;

    @Column(name = "role", length = 20)
    @Builder.Default
    private String role = "USER";

    // ACTIVE, BANNED
    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "status_reason", columnDefinition = "TEXT")
    private String statusReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "chat_ban_until")
    private LocalDateTime chatBanUntil;

    @Column(name = "warning_count")
    @Builder.Default
    private Integer warningCount = 0;
}
