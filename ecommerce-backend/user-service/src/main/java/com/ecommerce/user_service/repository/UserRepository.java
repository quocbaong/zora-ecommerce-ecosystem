package com.ecommerce.user_service.repository;

import com.ecommerce.user_service.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByUserId(String userId);

    Optional<User> findByEmail(String email);

    long countByRole(String role);

    Optional<User> findFirstByRole(String role);

    long countByCreatedAtAfter(java.time.LocalDateTime since);

    @Query("SELECT u FROM User u WHERE " +
           "(:role IS NULL OR u.role = :role) AND " +
           "(:status IS NULL OR u.status = :status) AND " +
           "(:searchPattern IS NULL OR LOWER(u.name) LIKE :searchPattern " +
           "  OR LOWER(u.email) LIKE :searchPattern)")
    Page<User> findByFilters(@Param("role") String role,
                             @Param("status") String status,
                             @Param("searchPattern") String searchPattern,
                             Pageable pageable);
}
