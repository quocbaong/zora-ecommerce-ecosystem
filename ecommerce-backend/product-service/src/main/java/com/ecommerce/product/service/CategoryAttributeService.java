package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.CategoryAttributeRequest;
import com.ecommerce.product.dto.response.CategoryAttributeResponse;

import java.util.List;

public interface CategoryAttributeService {

    List<CategoryAttributeResponse> getByCategory(String categoryId);

    CategoryAttributeResponse create(String categoryId, CategoryAttributeRequest request);

    CategoryAttributeResponse update(String categoryId, String attributeId, CategoryAttributeRequest request);

    void delete(String categoryId, String attributeId);
}
