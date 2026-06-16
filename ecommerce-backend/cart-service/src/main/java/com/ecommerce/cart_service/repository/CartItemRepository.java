package com.ecommerce.cart_service.repository;

import com.ecommerce.cart_service.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, String> {
    Optional<CartItem> findByCartIdAndProductIdAndVariantId(String cartId, String productId, String variantId);
    void deleteByCartId(String cartId);
}
