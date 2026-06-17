package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.ProductCreateRequest;
import com.ecommerce.product.dto.request.ProductUpdateRequest;
import com.ecommerce.product.dto.request.ReviewRequest;
import com.ecommerce.product.dto.response.ProductResponse;
import com.ecommerce.product.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ProductService {

    //Đăng bán sản phẩm mới
    ProductResponse createProduct(ProductCreateRequest request, String sellerId);

    //Upload list ảnh của sản phẩm
    List<String> uploadProductImages(String productId, List<MultipartFile> files, String sellerId, boolean replace);

    //Lấy thông tin chi tiết 1 sản phẩm
    ProductResponse getProductById(String productId);

    // Lọc và tìm kiếm phân trang (Có giá Min, Max, Category, Seller, Rating)
    Page<ProductResponse> filterAndSearchProducts(String keyword, String categoryId, String sellerId, Double minPrice, Double maxPrice, Integer minRating, Pageable pageable);

    // ADMIN/SELLER: Xóa sản phẩm
    void deleteProduct(String productId, String sellerId);

    // Update sản phẩm
    ProductResponse updateProduct(String productId, ProductUpdateRequest request, String sellerId);

    // Thêm loại màu/size cho Sản phẩm
    void createVariant(String productId, com.ecommerce.product.dto.request.VariantRequest request, String sellerId);

    // Đánh giá sao Sản phẩm
    void createReview(String productId, ReviewRequest request, String userId);

    // Lấy danh sách Đánh giá để hiển thị lên App
    List<com.ecommerce.product.dto.response.ReviewResponse> getReviewsByProductId(String productId);

    // Trừ tồn kho khi có đơn hàng — gọi từ order-service
    void decrementStock(String productId, String variantId, int quantity);

    // Cộng lại tồn kho khi hủy đơn hàng — gọi từ order-service
    void incrementStock(String productId, String variantId, int quantity);

    // Kiểm tra tồn kho cho danh sách sản phẩm trước khi tạo đơn
    com.ecommerce.product.dto.response.StockCheckResponse checkStock(com.ecommerce.product.dto.request.StockCheckRequest request);

    // Đồng bộ toàn bộ dữ liệu từ DB sang Elasticsearch
    void syncAllProductsToElasticsearch();
}
