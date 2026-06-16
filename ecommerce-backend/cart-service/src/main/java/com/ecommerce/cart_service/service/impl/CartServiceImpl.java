package com.ecommerce.cart_service.service.impl;

import com.ecommerce.cart_service.dto.request.CartItemRequest;
import com.ecommerce.cart_service.dto.request.MergeCartRequest;
import com.ecommerce.cart_service.dto.response.CartItemResponse;
import com.ecommerce.cart_service.dto.response.CartResponse;
import com.ecommerce.cart_service.entity.Cart;
import com.ecommerce.cart_service.entity.CartItem;
import com.ecommerce.cart_service.exception.AccessDeniedException;
import com.ecommerce.cart_service.exception.CartItemNotFoundException;
import com.ecommerce.cart_service.exception.CartNotFoundException;
import com.ecommerce.cart_service.exception.InvalidQuantityException;
import com.ecommerce.cart_service.repository.CartItemRepository;
import com.ecommerce.cart_service.repository.CartRepository;
import com.ecommerce.cart_service.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;

    private Cart getOrCreateCart(String userId) {
        return cartRepository.findByUserId(userId)
                .orElseGet(() -> cartRepository.save(
                        Cart.builder().userId(userId).build()
                ));
    }

    @Override
    public CartResponse getCart(String userId) {
        Cart cart = getOrCreateCart(userId);

        List<CartItemResponse> items = cart.getItems() == null ? List.of() :
                cart.getItems().stream().map(i ->
                        CartItemResponse.builder()
                                .id(i.getId())
                                .productId(i.getProductId())
                                .variantId(i.getVariantId())
                                .variantName(i.getVariantName())
                                .name(i.getName())
                                .image(i.getImage())
                                .sellerId(i.getSellerId())
                                .quantity(i.getQuantity())
                                .price(i.getPrice())
                                .subtotal(i.getPrice() * i.getQuantity())
                                .build()
                ).toList();

        Double totalPrice = items.stream()
                .mapToDouble(item -> item.getPrice() * item.getQuantity())
                .sum();
        Integer totalQuantity = items.stream()
                .mapToInt(CartItemResponse::getQuantity)
                .sum();

        return CartResponse.builder()
                .id(cart.getId())
                .userId(cart.getUserId())
                .items(items)
                .totalQuantity(totalQuantity)
                .totalPrice(totalPrice)
                .build();
    }

    @Override
    public void addItem(String userId, CartItemRequest request) {

        Cart cart = getOrCreateCart(userId);

        var existing = cartItemRepository
                .findByCartIdAndProductIdAndVariantId(
                        cart.getId(),
                        request.getProductId(),
                        request.getVariantId()
                );

        if (existing.isPresent()) {
            CartItem item = existing.get();
            item.setQuantity(item.getQuantity() + request.getQuantity());
            cartItemRepository.save(item);
        } else {
            CartItem item = CartItem.builder()
                    .cart(cart)
                    .productId(request.getProductId())
                    .variantId(request.getVariantId())
                    .variantName(request.getVariantName())
                    .name(request.getName())
                    .image(request.getImage())
                    .sellerId(request.getSellerId())
                    .quantity(request.getQuantity())
                    .price(request.getPrice())
                    .createdAt(LocalDateTime.now())
                    .build();

            cartItemRepository.save(item);
        }
    }

    @Override
    public void updateItem(String userId, String itemId, Integer quantity) {

        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new CartItemNotFoundException("Item not found"));

        if (!item.getCart().getUserId().equals(userId)) {
            throw new AccessDeniedException("Access denied");
        }

        if (quantity < 0) {
            throw new InvalidQuantityException("Quantity cannot be negative");
        }

        if (quantity == 0) {
            cartItemRepository.delete(item);
        } else {
            item.setQuantity(quantity);
            cartItemRepository.save(item);
        }
    }

    @Override
    public void removeItem(String userId, String itemId) {

        CartItem item = cartItemRepository.findById(itemId)
                .orElseThrow(() -> new CartItemNotFoundException("Item not found"));

        if (!item.getCart().getUserId().equals(userId)) {
            throw new AccessDeniedException("Access denied");
        }

        cartItemRepository.delete(item);
    }

    @Override
    @Transactional
    public void clearCart(String userId) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new CartNotFoundException("Cart not found"));

        cartItemRepository.deleteByCartId(cart.getId());
    }

    @Override
    public void mergeCart(String userId, MergeCartRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) return;

        Cart cart = getOrCreateCart(userId);

        for (MergeCartRequest.MergeCartItemRequest incoming : request.getItems()) {
            var existing = cartItemRepository.findByCartIdAndProductIdAndVariantId(
                    cart.getId(),
                    incoming.getProductId(),
                    incoming.getVariantId()
            );

            if (existing.isPresent()) {
                CartItem item = existing.get();
                item.setQuantity(item.getQuantity() + incoming.getQuantity());
                cartItemRepository.save(item);
            } else {
                CartItem item = CartItem.builder()
                        .cart(cart)
                        .productId(incoming.getProductId())
                        .variantId(incoming.getVariantId())
                        .variantName(incoming.getVariantName())
                        .name(incoming.getName())
                        .image(incoming.getImage())
                        .sellerId(incoming.getSellerId())
                        .quantity(incoming.getQuantity())
                        .price(incoming.getPrice())
                        .createdAt(LocalDateTime.now())
                        .build();
                cartItemRepository.save(item);
            }
        }
    }
}