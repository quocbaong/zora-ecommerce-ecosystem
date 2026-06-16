package com.ecommerce.order_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "outbox_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String aggregateId;   // orderId

    private String eventType;     // e.g. "order_created"

    @Column(columnDefinition = "TEXT")
    private String payload;       // JSON string

    @Builder.Default
    private String status = "PENDING"; // PENDING, SENT, FAILED

    @Builder.Default
    private int retryCount = 0;

    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
