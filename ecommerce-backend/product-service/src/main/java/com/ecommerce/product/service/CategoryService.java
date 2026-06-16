package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.CategoryRequest;
import com.ecommerce.product.dto.response.CategoryResponse;
import java.util.List;

public interface CategoryService {
    CategoryResponse createCategory(CategoryRequest request);
    List<CategoryResponse> getAllCategories();
    CategoryResponse getCategoryById(String id);
    CategoryResponse updateCategory(String id, CategoryRequest request);
    void deleteCategory(String id);
}
