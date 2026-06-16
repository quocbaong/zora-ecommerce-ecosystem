package com.ecommerce.user_service.repository;

import com.ecommerce.user_service.entity.UserWarning;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserWarningRepository extends JpaRepository<UserWarning, String> {
    List<UserWarning> findByStatusAndExpiresAtBefore(String status, LocalDateTime time);
    Optional<UserWarning> findFirstByUserIdAndStatusOrderByCreatedAtDesc(String userId, String status);
}
