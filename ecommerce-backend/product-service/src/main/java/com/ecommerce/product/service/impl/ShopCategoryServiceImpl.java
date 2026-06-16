package com.ecommerce.product.service.impl;

import com.ecommerce.product.dto.request.ShopCategoryRequest;
import com.ecommerce.product.dto.response.ShopCategoryResponse;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.entity.ShopCategory;
import com.ecommerce.product.entity.ShopCategoryProduct;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.repository.ShopCategoryProductRepository;
import com.ecommerce.product.repository.ShopCategoryRepository;
import com.ecommerce.product.service.ShopCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ShopCategoryServiceImpl implements ShopCategoryService {

    private final ShopCategoryRepository categoryRepository;
    private final ShopCategoryProductRepository linkRepository;
    private final ProductRepository productRepository;

    @Override
    public List<ShopCategoryResponse> listBySeller(String sellerId) {
        return categoryRepository.findBySellerIdOrderByPositionAsc(sellerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public ShopCategoryResponse create(String sellerId, ShopCategoryRequest request) {
        ShopCategory category = ShopCategory.builder()
                .sellerId(sellerId)
                .name(request.getName())
                .position(request.getPosition() == null ? 0 : request.getPosition())
                .build();
        ShopCategory saved = categoryRepository.save(category);
        if (request.getProductIds() != null) {
            setProducts(sellerId, saved.getId(), request.getProductIds());
        }
        return toResponse(saved);
    }

    @Override
    @Transactional
    public ShopCategoryResponse update(String sellerId, String id, ShopCategoryRequest request) {
        ShopCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SHOP_CATEGORY_NOT_FOUND"));
        if (!category.getSellerId().equals(sellerId)) {
            throw new RuntimeException("FORBIDDEN");
        }
        category.setName(request.getName());
        if (request.getPosition() != null) {
            category.setPosition(request.getPosition());
        }
        ShopCategory saved = categoryRepository.save(category);
        if (request.getProductIds() != null) {
            linkRepository.deleteByShopCategoryId(id);
            setProducts(sellerId, id, request.getProductIds());
        }
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void delete(String sellerId, String id) {
        ShopCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SHOP_CATEGORY_NOT_FOUND"));
        if (!category.getSellerId().equals(sellerId)) {
            throw new RuntimeException("FORBIDDEN");
        }
        linkRepository.deleteByShopCategoryId(id);
        categoryRepository.delete(category);
    }

    @Override
    public ShopCategoryResponse get(String id) {
        ShopCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("SHOP_CATEGORY_NOT_FOUND"));
        return toResponse(category);
    }

    private void setProducts(String sellerId, String categoryId, List<String> productIds) {
        for (String productId : productIds) {
            Product product = productRepository.findById(productId).orElse(null);
            if (product == null || !sellerId.equals(product.getSellerId())) {
                continue;
            }
            if (linkRepository.existsByShopCategoryIdAndProductId(categoryId, productId)) {
                continue;
            }
            linkRepository.save(ShopCategoryProduct.builder()
                    .shopCategoryId(categoryId)
                    .productId(productId)
                    .build());
        }
    }

    private ShopCategoryResponse toResponse(ShopCategory category) {
        List<ShopCategoryProduct> links = linkRepository.findByShopCategoryId(category.getId());
        List<String> productIds = links.stream().map(ShopCategoryProduct::getProductId).toList();
        return ShopCategoryResponse.builder()
                .id(category.getId())
                .sellerId(category.getSellerId())
                .name(category.getName())
                .position(category.getPosition())
                .productCount(productIds.size())
                .productIds(productIds)
                .build();
    }
}
