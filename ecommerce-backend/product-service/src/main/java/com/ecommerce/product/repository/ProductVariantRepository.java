package com.ecommerce.product.repository;

import com.ecommerce.product.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, String> {

    List<ProductVariant> findByProductId(String productId);

    @Modifying
    @Query("UPDATE ProductVariant v SET v.stock = v.stock - :qty WHERE v.id = :id AND v.stock >= :qty")
    int decrementStockAtomic(@Param("id") String id, @Param("qty") int qty);

    @Modifying
    @Query("UPDATE ProductVariant v SET v.stock = v.stock + :qty WHERE v.id = :id")
    int incrementStockAtomic(@Param("id") String id, @Param("qty") int qty);
}
