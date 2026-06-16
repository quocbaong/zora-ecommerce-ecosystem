package com.ecommerce.product.repository;

import com.ecommerce.product.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, String> {
    //Search by ParentId
    List<Category> findByParentId(String parentId);

    //Find by name
    Optional<Category> findByNameIgnoreCase(String name);
}
