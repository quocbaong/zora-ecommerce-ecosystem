package com.ecommerce.product.service.impl;

import com.ecommerce.product.dto.request.CategoryRequest;
import com.ecommerce.product.dto.response.CategoryResponse;
import com.ecommerce.product.entity.Category;
import com.ecommerce.product.repository.CategoryRepository;
import com.ecommerce.product.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final CategoryImageUploadService categoryImageUploadService;

    @Override
    @CacheEvict(value = "categories", allEntries = true)
    public CategoryResponse createCategory(CategoryRequest request) {
        // Kiểm tra xem tên danh mục đã tồn tại chưa
        if (categoryRepository.findByNameIgnoreCase(request.getName()).isPresent()) {
            throw new RuntimeException("Danh mục này đã tồn tại!");
        }

        Category category = Category.builder()
                .name(request.getName())
                .parentId(request.getParentId())
                .imageUrl(request.getImageUrl())
                .build();

        Category savedCategory = categoryRepository.save(category);

        return mapToResponse(savedCategory);
    }

    @Override
    @Cacheable("categories")
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public CategoryResponse getCategoryById(String id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Danh mục có ID: " + id));
        return mapToResponse(category);
    }

    @Override
    @CacheEvict(value = "categories", allEntries = true)
    public CategoryResponse updateCategory(String id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Danh mục có ID: " + id));

        String oldImageUrl = category.getImageUrl();
        String newImageUrl = request.getImageUrl();

        // Xoá ảnh cũ trên S3 nếu ảnh thay đổi
        if (oldImageUrl != null && !oldImageUrl.isBlank()
                && !oldImageUrl.equals(newImageUrl)) {
            categoryImageUploadService.deleteImage(oldImageUrl);
        }

        category.setName(request.getName());
        category.setParentId(request.getParentId());
        category.setImageUrl(newImageUrl);

        Category updatedCategory = categoryRepository.save(category);
        return mapToResponse(updatedCategory);
    }

    @Override
    @CacheEvict(value = "categories", allEntries = true)
    public void deleteCategory(String id) {
        if (!categoryRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy Danh mục để xóa");
        }
        categoryRepository.deleteById(id);
    }

    private CategoryResponse mapToResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .parentId(category.getParentId())
                .imageUrl(category.getImageUrl())
                .build();
    }
}
