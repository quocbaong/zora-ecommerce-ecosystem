package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.ShopCategoryRequest;
import com.ecommerce.product.dto.response.ShopCategoryResponse;

import java.util.List;

public interface ShopCategoryService {
    List<ShopCategoryResponse> listBySeller(String sellerId);

    ShopCategoryResponse create(String sellerId, ShopCategoryRequest request);

    ShopCategoryResponse update(String sellerId, String id, ShopCategoryRequest request);

    void delete(String sellerId, String id);

    ShopCategoryResponse get(String id);
}
