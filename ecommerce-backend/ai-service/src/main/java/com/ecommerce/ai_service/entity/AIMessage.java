package com.ecommerce.ai_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String conversationId;
    private String senderType;  // USER or ASSISTANT
    private String roleAtTime;  // USER or SELLER

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String richDataJson; // JSON of last tool result

    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
