package com.ecommerce.notification_service.repository;

import com.ecommerce.notification_service.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {

    // Phân trang thông báo của user, mới nhất lên đầu
    Page<Notification> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    // Đếm số lượng thông báo chưa đọc
    long countByUserIdAndIsReadFalse(String userId);

    // Lấy tất cả thông báo chưa đọc của user (để mark all read)
    List<Notification> findByUserIdAndIsReadFalse(String userId);
}
