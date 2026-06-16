package com.ecommerce.product.repository;

import com.ecommerce.product.entity.ProductReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductReviewRepository extends JpaRepository<ProductReview, String> {

    // Lấy danh sách đánh giá của 1 sản phẩm
    List<ProductReview> findByProductId(String productId);

    // Lấy toàn bộ đánh giá mà 1 Khách Hàng (User) đã từng viết
    List<ProductReview> findByUserId(String userId);
}
