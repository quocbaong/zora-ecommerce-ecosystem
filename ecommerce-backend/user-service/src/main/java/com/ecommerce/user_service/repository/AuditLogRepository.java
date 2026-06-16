package com.ecommerce.user_service.repository;

import com.ecommerce.user_service.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, String> {

    Page<AuditLog> findByAdminId(String adminId, Pageable pageable);

    Page<AuditLog> findByTargetTypeAndTargetId(String targetType, String targetId, Pageable pageable);
}
