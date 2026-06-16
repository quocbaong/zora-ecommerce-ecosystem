package com.ecommerce.product.repository;

import com.ecommerce.product.entity.ShopCategoryProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShopCategoryProductRepository extends JpaRepository<ShopCategoryProduct, String> {
    List<ShopCategoryProduct> findByShopCategoryId(String shopCategoryId);

    void deleteByShopCategoryIdAndProductId(String shopCategoryId, String productId);

    void deleteByShopCategoryId(String shopCategoryId);

    boolean existsByShopCategoryIdAndProductId(String shopCategoryId, String productId);
}
