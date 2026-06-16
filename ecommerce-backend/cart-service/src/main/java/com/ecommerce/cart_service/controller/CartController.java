package com.ecommerce.cart_service.controller;

import com.ecommerce.cart_service.dto.request.CartItemRequest;
import com.ecommerce.cart_service.dto.request.MergeCartRequest;
import com.ecommerce.cart_service.dto.response.ApiResponse;
import com.ecommerce.cart_service.service.CartService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    private String getUserId(HttpServletRequest request) {
        return request.getHeader("X-User-Id");
    }

    @GetMapping
    public ApiResponse<?> getCart(HttpServletRequest request) {
        String userId = getUserId(request);
        if (userId == null || userId.isEmpty()) {
            return ApiResponse.builder()
                    .success(false)
                    .error("MISSING_USER_ID")
                    .message("X-User-Id header is required")
                    .build();
        }
        return ApiResponse.builder()
                .success(true)
                .data(cartService.getCart(userId))
                .message("success")
                .build();
    }

    @PostMapping({"/items", "/add"})
    public ApiResponse<?> addItem(HttpServletRequest request,
                                  @jakarta.validation.Valid @RequestBody CartItemRequest req) {

        String userId = getUserId(request);
        if (userId == null || userId.isEmpty()) {
            return ApiResponse.builder()
                    .success(false)
                    .error("MISSING_USER_ID")
                    .message("X-User-Id header is required")
                    .build();
        }

        cartService.addItem(userId, req);

        return ApiResponse.builder()
                .success(true)
                .message("Item added")
                .build();
    }

    @PutMapping("/items/{id}")
    public ApiResponse<?> updateItem(HttpServletRequest request,
                                     @PathVariable String id,
                                     @RequestParam Integer quantity) {

        cartService.updateItem(getUserId(request), id, quantity);

        return ApiResponse.builder()
                .success(true)
                .message("Updated")
                .build();
    }

    @DeleteMapping("/items/{id}")
    public ApiResponse<?> removeItem(HttpServletRequest request,
                                     @PathVariable String id) {

        cartService.removeItem(getUserId(request), id);

        return ApiResponse.builder()
                .success(true)
                .message("Deleted")
                .build();
    }

    @DeleteMapping
    public ApiResponse<?> clearCart(HttpServletRequest request) {

        cartService.clearCart(getUserId(request));

        return ApiResponse.builder()
                .success(true)
                .message("Cart cleared")
                .build();
    }

    @PostMapping("/merge")
    public ApiResponse<?> mergeCart(HttpServletRequest request,
                                    @RequestBody MergeCartRequest req) {
        String userId = getUserId(request);
        if (userId == null || userId.isEmpty()) {
            return ApiResponse.builder()
                    .success(false)
                    .error("MISSING_USER_ID")
                    .message("X-User-Id header is required")
                    .build();
        }
        cartService.mergeCart(userId, req);
        return ApiResponse.builder()
                .success(true)
                .message("Cart merged")
                .build();
    }
}