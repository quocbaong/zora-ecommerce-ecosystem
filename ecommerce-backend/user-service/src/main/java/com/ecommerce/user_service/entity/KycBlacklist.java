package com.ecommerce.user_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "kyc_blacklist")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KycBlacklist {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    // CCCD, TAX_CODE, EMAIL, PHONE
    @Column(name = "type", nullable = false, length = 20)
    private String type;

    @Column(name = "value", nullable = false, unique = true, length = 100)
    private String value;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "banned_by", length = 36)
    private String bannedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
