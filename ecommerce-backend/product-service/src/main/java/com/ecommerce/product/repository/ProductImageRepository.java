package com.ecommerce.product.repository;

import com.ecommerce.product.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, String> {
    // Tim tat ca anh cua 1 san pham
    List<ProductImage> findByProductId(String productId);

    //Lay anh dai dien chinh cua san pham
    ProductImage findByProductIdAndIsMainTrue(String productId);
}
