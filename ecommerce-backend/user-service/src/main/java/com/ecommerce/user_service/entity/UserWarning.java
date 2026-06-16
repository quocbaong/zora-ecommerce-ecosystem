package com.ecommerce.user_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_warnings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserWarning {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "warning_number")
    private int warningNumber;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    // PENDING_APPEAL, APPEALING, PENALTY_APPLIED, APPEAL_APPROVED, APPEAL_REJECTED
    @Column(name = "status", length = 30)
    @Builder.Default
    private String status = "PENDING_APPEAL";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;
}
