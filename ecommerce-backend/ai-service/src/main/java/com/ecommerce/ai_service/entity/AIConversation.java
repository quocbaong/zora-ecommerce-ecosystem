package com.ecommerce.ai_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_conversations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIConversation {

    @Id
    private String id; // "AI#<userId>#<uuid>"

    private String userId;
    private String roleAtTime;  // USER or SELLER at conversation start
    private String title;       // first 60 chars of first message

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
