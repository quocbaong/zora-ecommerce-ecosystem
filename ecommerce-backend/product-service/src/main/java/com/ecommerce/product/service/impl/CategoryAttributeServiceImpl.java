package com.ecommerce.product.service.impl;

import com.ecommerce.product.dto.request.CategoryAttributeRequest;
import com.ecommerce.product.dto.response.CategoryAttributeResponse;
import com.ecommerce.product.entity.CategoryAttribute;
import com.ecommerce.product.repository.CategoryAttributeRepository;
import com.ecommerce.product.repository.CategoryRepository;
import com.ecommerce.product.service.CategoryAttributeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryAttributeServiceImpl implements CategoryAttributeService {

    private final CategoryAttributeRepository attributeRepository;
    private final CategoryRepository categoryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CategoryAttributeResponse> getByCategory(String categoryId) {
        ensureCategoryExists(categoryId);
        return attributeRepository.findByCategoryIdOrderByDisplayOrderAsc(categoryId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CategoryAttributeResponse create(String categoryId, CategoryAttributeRequest request) {
        ensureCategoryExists(categoryId);

        attributeRepository.findByCategoryIdAndName(categoryId, request.getName())
                .ifPresent(a -> { throw new RuntimeException("Trường thông tin với khóa '" + request.getName() + "' đã tồn tại trong danh mục này"); });

        CategoryAttribute entity = CategoryAttribute.builder()
                .categoryId(categoryId)
                .name(request.getName())
                .label(request.getLabel())
                .type(request.getType())
                .required(Boolean.TRUE.equals(request.getRequired()))
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .placeholder(request.getPlaceholder())
                .build();

        return toResponse(attributeRepository.save(entity));
    }

    @Override
    @Transactional
    public CategoryAttributeResponse update(String categoryId, String attributeId, CategoryAttributeRequest request) {
        CategoryAttribute entity = attributeRepository.findById(attributeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy trường thông tin"));

        if (!entity.getCategoryId().equals(categoryId)) {
            throw new RuntimeException("Trường thông tin không thuộc danh mục này");
        }

        // Nếu đổi key (name), kiểm tra trùng
        if (!entity.getName().equals(request.getName())) {
            attributeRepository.findByCategoryIdAndName(categoryId, request.getName())
                    .ifPresent(a -> { throw new RuntimeException("Khóa '" + request.getName() + "' đã được dùng cho trường khác"); });
            entity.setName(request.getName());
        }

        entity.setLabel(request.getLabel());
        entity.setType(request.getType());
        entity.setRequired(Boolean.TRUE.equals(request.getRequired()));
        entity.setDisplayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0);
        entity.setPlaceholder(request.getPlaceholder());

        return toResponse(attributeRepository.save(entity));
    }

    @Override
    @Transactional
    public void delete(String categoryId, String attributeId) {
        CategoryAttribute entity = attributeRepository.findById(attributeId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy trường thông tin"));
        if (!entity.getCategoryId().equals(categoryId)) {
            throw new RuntimeException("Trường thông tin không thuộc danh mục này");
        }
        attributeRepository.delete(entity);
    }

    private void ensureCategoryExists(String categoryId) {
        if (!categoryRepository.existsById(categoryId)) {
            throw new RuntimeException("Không tìm thấy danh mục có ID: " + categoryId);
        }
    }

    private CategoryAttributeResponse toResponse(CategoryAttribute e) {
        return CategoryAttributeResponse.builder()
                .id(e.getId())
                .categoryId(e.getCategoryId())
                .name(e.getName())
                .label(e.getLabel())
                .type(e.getType())
                .required(e.getRequired())
                .displayOrder(e.getDisplayOrder())
                .placeholder(e.getPlaceholder())
                .build();
    }
}
