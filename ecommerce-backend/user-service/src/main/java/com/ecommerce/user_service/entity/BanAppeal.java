package com.ecommerce.user_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "ban_appeals")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BanAppeal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @Column(nullable = false)
    private String email;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "ban_appeal_evidence_images", joinColumns = @JoinColumn(name = "appeal_id"))
    @Column(name = "image_url")
    private List<String> evidenceImages = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private BanAppealStatus status = BanAppealStatus.PENDING;



    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @Column(name = "warning_id")
    private String warningId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
