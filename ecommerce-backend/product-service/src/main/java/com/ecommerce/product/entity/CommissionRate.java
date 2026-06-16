package com.ecommerce.product.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "commission_rates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommissionRate {

    @Id
    @Column(name = "category_id", length = 36)
    private String categoryId;

    @Column(nullable = false)
    private Double rate; // Tỉ lệ hoa hồng theo %, ví dụ 5.0 = 5%

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
