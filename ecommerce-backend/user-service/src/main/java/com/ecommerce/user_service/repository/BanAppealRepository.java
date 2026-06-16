package com.ecommerce.user_service.repository;

import com.ecommerce.user_service.entity.BanAppeal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BanAppealRepository extends JpaRepository<BanAppeal, String> {
    Optional<BanAppeal> findFirstByEmailOrderByCreatedAtDesc(String email);
}
