package com.ecommerce.product.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "product_reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductReview {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(length = 36, updatable = false, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    // Lưu User ID của người viết đánh giá (Lấy từ HTTP Header do Gateway cấp)
    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Column(nullable = false)
    private Integer rating; // (1 -> 5 sao)

    @Column(name = "review_text", columnDefinition = "TEXT")
    private String reviewText; // Nội dung đánh giá

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // ReviewImage
     @OneToMany(mappedBy = "review", cascade = CascadeType.ALL)
     private List<ReviewImage> reviewImages;
}
