package com.ecommerce.cart_service.service;


import com.ecommerce.cart_service.dto.request.CartItemRequest;
import com.ecommerce.cart_service.dto.request.MergeCartRequest;
import com.ecommerce.cart_service.dto.response.CartResponse;

public interface CartService {
    CartResponse getCart(String userId);
    void addItem(String userId, CartItemRequest request);
    void updateItem(String userId, String itemId, Integer quantity);
    void removeItem(String userId, String itemId);
    void clearCart(String userId);
    void mergeCart(String userId, MergeCartRequest request);
}