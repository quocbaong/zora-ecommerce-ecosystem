package com.ecommerce.order_service.repository;

import com.ecommerce.order_service.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

public interface OrderRepository extends JpaRepository<Order, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.id = :id")
    Optional<Order> findByIdWithLock(@Param("id") String id);

    @Query("SELECT o FROM Order o WHERE o.status = 'SHIPPING' AND o.updatedAt < :thresholdDate")
    List<Order> findOverdueShippedOrders(@Param("thresholdDate") LocalDateTime thresholdDate);

    @Query("SELECT o FROM Order o WHERE o.status = 'DELIVERED' AND o.deliveredAt < :thresholdDate AND NOT EXISTS (SELECT r FROM RefundRequest r WHERE r.orderId = o.id)")
    List<Order> findExpiredDeliveredOrders(@Param("thresholdDate") LocalDateTime thresholdDate);

    @Query("SELECT o FROM Order o WHERE o.status = 'PENDING' AND o.paymentStatus = 'PENDING' AND o.paymentMethod != 'COD'")
    List<Order> findPendingOnlineOrders();

    Page<Order> findByUserId(String userId, Pageable pageable);

    // Paginated — subquery avoids Hibernate in-memory pagination warning on JOIN FETCH
    @Query("SELECT o FROM Order o WHERE o.id IN " +
           "(SELECT DISTINCT o2.id FROM Order o2 JOIN o2.items i WHERE i.sellerId = :sellerId) " +
           "AND (o.paymentMethod = 'COD' OR o.paymentStatus IN ('PAID', 'REFUNDED')) " +
           "ORDER BY o.createdAt DESC")
    Page<Order> findBySellerIdPaged(@Param("sellerId") String sellerId, Pageable pageable);

    // Kept for backward compat (used by sellerStatsAggregate fallback)
    @Query("SELECT DISTINCT o FROM Order o JOIN o.items i WHERE i.sellerId = :sellerId AND (o.paymentMethod = 'COD' OR o.paymentStatus IN ('PAID', 'REFUNDED')) ORDER BY o.createdAt DESC")
    List<Order> findBySellerId(@Param("sellerId") String sellerId);

    // SQL aggregation for getSellerStats — avoids loading all orders into heap
    @Query(value = """
        SELECT
            COUNT(DISTINCT o.id),
            COALESCE(SUM(CASE WHEN o.status != 'CANCELLED' THEN o.total_price ELSE 0 END), 0),
            COUNT(DISTINCT CASE WHEN o.created_at >= :startOfDay THEN o.id END)
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.seller_id = :sellerId
          AND (o.payment_method = 'COD' OR o.payment_status = 'PAID')
        """, nativeQuery = true)
    Object sellerStatsAggregate(@Param("sellerId") String sellerId,
                                   @Param("startOfDay") LocalDateTime startOfDay);

    @Query("SELECT DISTINCT o FROM Order o JOIN o.items i WHERE i.sellerId = :sellerId AND o.createdAt >= :since AND (o.paymentMethod = 'COD' OR o.paymentStatus = 'PAID')")
    List<Order> findBySellerIdSince(@Param("sellerId") String sellerId, @Param("since") LocalDateTime since);

    // Revenue by day: returns [date_label, revenue, order_count]
    @Query(value = """
        SELECT TO_CHAR(o.created_at, 'DD/MM') AS label,
               COALESCE(SUM(oi.subtotal), 0) AS revenue,
               COUNT(DISTINCT o.id) AS orders
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.seller_id = :sellerId
          AND o.created_at >= :since
          AND o.status NOT IN ('CANCELLED')
          AND (o.payment_method = 'COD' OR o.payment_status = 'PAID')
        GROUP BY TO_CHAR(o.created_at, 'DD/MM'), DATE(o.created_at)
        ORDER BY DATE(o.created_at)
        """, nativeQuery = true)
    List<Object[]> revenueByDay(@Param("sellerId") String sellerId, @Param("since") LocalDateTime since);

    // Revenue by month: returns [month_label, revenue, order_count]
    @Query(value = """
        SELECT TO_CHAR(o.created_at, 'MM/YYYY') AS label,
               COALESCE(SUM(oi.subtotal), 0) AS revenue,
               COUNT(DISTINCT o.id) AS orders
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.seller_id = :sellerId
          AND o.status NOT IN ('CANCELLED')
          AND (o.payment_method = 'COD' OR o.payment_status = 'PAID')
        GROUP BY TO_CHAR(o.created_at, 'MM/YYYY'), DATE_TRUNC('month', o.created_at)
        ORDER BY DATE_TRUNC('month', o.created_at)
        """, nativeQuery = true)
    List<Object[]> revenueByMonth(@Param("sellerId") String sellerId);

    // Admin stats: total orders, total revenue, revenue today, revenue this month, orders by status
    @Query(value = """
        SELECT
            COUNT(DISTINCT o.id) AS total_orders,
            COALESCE(SUM(CASE WHEN o.status != 'CANCELLED' THEN o.total_price ELSE 0 END), 0) AS total_revenue,
            COALESCE(SUM(CASE WHEN o.created_at >= :startOfDay AND o.status != 'CANCELLED' THEN o.total_price ELSE 0 END), 0) AS revenue_today,
            COALESCE(SUM(CASE WHEN o.created_at >= :startOfMonth AND o.status != 'CANCELLED' THEN o.total_price ELSE 0 END), 0) AS revenue_month,
            COUNT(CASE WHEN o.status = 'PENDING' THEN 1 END) AS pending,
            COUNT(CASE WHEN o.status = 'CONFIRMED' THEN 1 END) AS confirmed,
            COUNT(CASE WHEN o.status = 'SHIPPING' THEN 1 END) AS shipping,
            COUNT(CASE WHEN o.status = 'DELIVERED' THEN 1 END) AS delivered,
            COUNT(CASE WHEN o.status = 'CANCELLED' THEN 1 END) AS cancelled
        FROM orders o
        """, nativeQuery = true)
    List<Object[]> adminStatsAggregate(@Param("startOfDay") LocalDateTime startOfDay,
                                       @Param("startOfMonth") LocalDateTime startOfMonth);

    // Top products: returns [productId, productName, productImage, totalSold, totalRevenue]
    // GROUP BY chỉ theo product_id, dùng MAX() để lấy name/image mới nhất — tránh duplicate rows
    @Query(value = """
        SELECT oi.product_id,
               MAX(oi.product_name) AS product_name,
               MAX(oi.product_image) AS product_image,
               SUM(oi.quantity) AS total_sold,
               SUM(oi.subtotal) AS total_revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.seller_id = :sellerId
          AND o.status NOT IN ('CANCELLED')
          AND (o.payment_method = 'COD' OR o.payment_status = 'PAID')
        GROUP BY oi.product_id
        ORDER BY total_revenue DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> topProducts(@Param("sellerId") String sellerId, @Param("limit") int limit);

    // Seller trends: aggregate 7d vs prev 7d
    // Trả về [rev_7d, rev_prev7d, orders_7d, orders_prev7d, cancelled_7d, cancelled_prev7d]
    @Query(value = """
        SELECT
            COALESCE(SUM(CASE WHEN o.created_at >= :start7d AND o.status != 'CANCELLED' THEN oi.subtotal ELSE 0 END), 0) AS rev_7d,
            COALESCE(SUM(CASE WHEN o.created_at >= :start14d AND o.created_at < :start7d AND o.status != 'CANCELLED' THEN oi.subtotal ELSE 0 END), 0) AS rev_prev7d,
            COUNT(DISTINCT CASE WHEN o.created_at >= :start7d AND o.status != 'CANCELLED' THEN o.id END) AS orders_7d,
            COUNT(DISTINCT CASE WHEN o.created_at >= :start14d AND o.created_at < :start7d AND o.status != 'CANCELLED' THEN o.id END) AS orders_prev7d,
            COUNT(DISTINCT CASE WHEN o.created_at >= :start7d AND o.status = 'CANCELLED' THEN o.id END) AS cancelled_7d,
            COUNT(DISTINCT CASE WHEN o.created_at >= :start14d AND o.created_at < :start7d AND o.status = 'CANCELLED' THEN o.id END) AS cancelled_prev7d
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.seller_id = :sellerId
          AND o.created_at >= :start14d
          AND (o.payment_method = 'COD' OR o.payment_status = 'PAID')
        """, nativeQuery = true)
    List<Object[]> sellerTrendsAggregate(@Param("sellerId") String sellerId,
                                         @Param("start7d") LocalDateTime start7d,
                                         @Param("start14d") LocalDateTime start14d);

    // Seller trends: top movers (sản phẩm có doanh thu 7d cao nhất + so với prev 7d)
    @Query(value = """
        SELECT
            oi.product_id,
            MAX(oi.product_name) AS name,
            MAX(oi.product_image) AS image,
            COALESCE(SUM(CASE WHEN o.created_at >= :start7d THEN oi.subtotal ELSE 0 END), 0) AS rev_7d,
            COALESCE(SUM(CASE WHEN o.created_at >= :start14d AND o.created_at < :start7d THEN oi.subtotal ELSE 0 END), 0) AS rev_prev7d,
            COALESCE(SUM(CASE WHEN o.created_at >= :start7d THEN oi.quantity ELSE 0 END), 0) AS sold_7d
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.seller_id = :sellerId
          AND o.created_at >= :start14d
          AND o.status NOT IN ('CANCELLED')
          AND (o.payment_method = 'COD' OR o.payment_status = 'PAID')
        GROUP BY oi.product_id
        HAVING SUM(CASE WHEN o.created_at >= :start7d THEN oi.subtotal ELSE 0 END) > 0
        ORDER BY rev_7d DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> sellerTopMovers(@Param("sellerId") String sellerId,
                                   @Param("start7d") LocalDateTime start7d,
                                   @Param("start14d") LocalDateTime start14d,
                                   @Param("limit") int limit);

    // Admin: doanh thu theo ngày (chỉ đơn DELIVERED)
    @Query(value = """
        SELECT TO_CHAR(o.created_at, 'DD/MM/YYYY') AS label,
               DATE(o.created_at) AS sort_date,
               COALESCE(SUM(o.total_price), 0) AS revenue,
               COUNT(o.id) AS order_count
        FROM orders o
        WHERE o.status = 'DELIVERED'
          AND o.created_at >= :since
        GROUP BY TO_CHAR(o.created_at, 'DD/MM/YYYY'), DATE(o.created_at)
        ORDER BY DATE(o.created_at)
        """, nativeQuery = true)
    List<Object[]> adminRevenueByDay(@Param("since") LocalDateTime since);

    // Admin: doanh thu theo tháng (chỉ đơn DELIVERED)
    @Query(value = """
        SELECT TO_CHAR(o.created_at, 'MM/YYYY') AS label,
               DATE_TRUNC('month', o.created_at) AS sort_date,
               COALESCE(SUM(o.total_price), 0) AS revenue,
               COUNT(o.id) AS order_count
        FROM orders o
        WHERE o.status = 'DELIVERED'
        GROUP BY TO_CHAR(o.created_at, 'MM/YYYY'), DATE_TRUNC('month', o.created_at)
        ORDER BY DATE_TRUNC('month', o.created_at)
        """, nativeQuery = true)
    List<Object[]> adminRevenueByMonth();

    // Admin: doanh thu theo seller (chỉ đơn DELIVERED)
    @Query(value = """
        SELECT oi.seller_id,
               COALESCE(SUM(oi.subtotal), 0) AS revenue,
               COUNT(DISTINCT o.id) AS order_count,
               SUM(oi.quantity) AS items_sold
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status = 'DELIVERED'
        GROUP BY oi.seller_id
        ORDER BY revenue DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> adminRevenueBySellerTop(@Param("limit") int limit);

    @Query(value = """
        SELECT o.id, o.user_id, o.total_price, o.created_at, o.delivered_at,
               oi.seller_id, oi.product_name, oi.quantity, oi.price, oi.subtotal
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.status = 'DELIVERED'
          AND o.created_at >= :since
        ORDER BY o.created_at DESC
        """, nativeQuery = true)
    List<Object[]> adminExportRevenue(@Param("since") LocalDateTime since);

    // @Query(value = "SELECT * FROM orders WHERE status IN ('REFUNDED', 'DELIVERED', 'CANCELLED') AND updated_at < :threshold AND dispute_evidence_urls IS NOT NULL AND jsonb_array_length(dispute_evidence_urls) > 0", nativeQuery = true)
    // List<Order> findOldOrdersWithEvidences(@Param("threshold") LocalDateTime threshold);
}