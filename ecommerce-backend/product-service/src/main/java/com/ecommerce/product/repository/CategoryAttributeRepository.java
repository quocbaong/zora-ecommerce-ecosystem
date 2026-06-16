package com.ecommerce.product.repository;

import com.ecommerce.product.entity.CategoryAttribute;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryAttributeRepository extends JpaRepository<CategoryAttribute, String> {

    List<CategoryAttribute> findByCategoryIdOrderByDisplayOrderAsc(String categoryId);

    Optional<CategoryAttribute> findByCategoryIdAndName(String categoryId, String name);

    void deleteByCategoryId(String categoryId);
}
