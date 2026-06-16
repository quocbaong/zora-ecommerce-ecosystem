package com.ecommerce.product.repository;

import com.ecommerce.product.entity.ShopCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShopCategoryRepository extends JpaRepository<ShopCategory, String> {
    List<ShopCategory> findBySellerIdOrderByPositionAsc(String sellerId);
}
