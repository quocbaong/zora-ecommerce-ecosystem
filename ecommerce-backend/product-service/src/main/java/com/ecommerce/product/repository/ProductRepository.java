package com.ecommerce.product.repository;

import com.ecommerce.product.entity.Product;
import com.ecommerce.product.entity.ProductStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductRepository extends JpaRepository<Product, String> {

    // 1. Tìm tất cả sản phẩm của 1 danh mục
    List<Product> findByCategoryId(String categoryId);

    // 2. Tìm tất cả sản phẩm của 1 Shop (Người bán)
    List<Product> findBySellerId(String sellerId);

    // Lấy product với Pessimistic Write Lock — dùng khi update rating để tránh race condition
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdWithLock(@Param("id") String id);

    // 3. Tìm sản phẩm theo tên (Search Product) - Có phân biệt trạng thái ACTIVE
    List<Product> findByNameContainingIgnoreCaseAndStatus(String keyword, ProductStatus status);

    // 4. Tìm top 10 sản phẩm giá rẻ nhất có tồn kho > 0
    // Bạn có thể dùng @Query
    @Query("SELECT p FROM Product p WHERE p.stock > 0 AND p.status = 'ACTIVE' ORDER BY p.price ASC LIMIT 10")
    List<Product> findTop10CheapestAvailableProducts();

    // 5. Phân trang & Tìm kiếm (Dành cho trang chủ / trang tìm kiếm có hàng triệu SP)
    Page<Product> findByNameContainingIgnoreCaseAndStatus(String keyword, ProductStatus status, Pageable pageable);

    // 6. Lọc sản phẩm theo Danh mục + Khoảng giá min/max + Trạng thái ACTIVE (Có phân trang)
    // JOIN FETCH p.category để tránh N+1 query khi mapToProductResponse gọi product.getCategory().getName()
    // unaccent() để keyword tiếng Việt có/không dấu đều match (ví dụ: "dien thoai" tìm được "Điện thoại")
    @Query(value = "SELECT p FROM Product p JOIN FETCH p.category c WHERE " +
           "(COALESCE(:keyword, '') = '' OR LOWER(FUNCTION('unaccent', p.name)) LIKE LOWER(FUNCTION('unaccent', CONCAT('%', :keyword, '%')))) AND " +
           "(COALESCE(:categoryId, '') = '' OR c.id = :categoryId) AND " +
           "(COALESCE(:sellerId, '') = '' OR p.sellerId = :sellerId) AND " +
           "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR p.price <= :maxPrice) AND " +
           "(:minRating IS NULL OR p.ratingAvg >= :minRating) AND " +
           "p.status = :status",
           countQuery = "SELECT COUNT(p) FROM Product p JOIN p.category c WHERE " +
           "(COALESCE(:keyword, '') = '' OR LOWER(FUNCTION('unaccent', p.name)) LIKE LOWER(FUNCTION('unaccent', CONCAT('%', :keyword, '%')))) AND " +
           "(COALESCE(:categoryId, '') = '' OR c.id = :categoryId) AND " +
           "(COALESCE(:sellerId, '') = '' OR p.sellerId = :sellerId) AND " +
           "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR p.price <= :maxPrice) AND " +
           "(:minRating IS NULL OR p.ratingAvg >= :minRating) AND " +
           "p.status = :status")
    Page<Product> searchProducts(
            @Param("keyword") String keyword,
            @Param("categoryId") String categoryId,
            @Param("sellerId") String sellerId,
            @Param("status") ProductStatus status,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("minRating") BigDecimal minRating,
            Pageable pageable
    );

    @Modifying
    @Query("UPDATE Product p SET p.stock = p.stock - :qty, p.soldCount = p.soldCount + :qty WHERE p.id = :id AND p.stock >= :qty")
    int decrementStockAtomic(@Param("id") String id, @Param("qty") int qty);

    @Modifying
    @Query("UPDATE Product p SET p.soldCount = p.soldCount + :qty WHERE p.id = :id")
    int incrementSoldCount(@Param("id") String id, @Param("qty") int qty);

    @Modifying
    @Query("UPDATE Product p SET p.stock = p.stock + :qty WHERE p.id = :id")
    int incrementStockAtomic(@Param("id") String id, @Param("qty") int qty);

    // Admin: list tất cả sản phẩm bất kể status, hỗ trợ filter
    @Query(value = "SELECT p FROM Product p JOIN FETCH p.category c WHERE " +
           "(COALESCE(:keyword, '') = '' OR UPPER(p.name) LIKE UPPER(CONCAT('%', :keyword, '%'))) AND " +
           "(COALESCE(:categoryId, '') = '' OR c.id = :categoryId) AND " +
           "(COALESCE(:sellerId, '') = '' OR p.sellerId = :sellerId) AND " +
           "(:status IS NULL OR p.status = :status)",
           countQuery = "SELECT COUNT(p) FROM Product p JOIN p.category c WHERE " +
           "(COALESCE(:keyword, '') = '' OR UPPER(p.name) LIKE UPPER(CONCAT('%', :keyword, '%'))) AND " +
           "(COALESCE(:categoryId, '') = '' OR c.id = :categoryId) AND " +
           "(COALESCE(:sellerId, '') = '' OR p.sellerId = :sellerId) AND " +
           "(:status IS NULL OR p.status = :status)")
    Page<Product> adminSearchProducts(
            @Param("keyword") String keyword,
            @Param("categoryId") String categoryId,
            @Param("sellerId") String sellerId,
            @Param("status") ProductStatus status,
            Pageable pageable
    );

    long countByStatus(ProductStatus status);

    long countByCreatedAtAfter(java.time.LocalDate since);
}
