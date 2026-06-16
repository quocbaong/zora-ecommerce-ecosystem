package com.ecommerce.user_service.repository;

import com.ecommerce.user_service.entity.SellerApplication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SellerApplicationRepository extends JpaRepository<SellerApplication, String> {

    Optional<SellerApplication> findByUserId(String userId);

    boolean existsByUserId(String userId);

    boolean existsByIdNumber(String idNumber);

    boolean existsByIdNumberAndUserIdNot(String idNumber, String userId);

    boolean existsByTaxCode(String taxCode);

    boolean existsByTaxCodeAndUserIdNot(String taxCode, String userId);

    Page<SellerApplication> findByStatus(String status, Pageable pageable);

    Page<SellerApplication> findAll(Pageable pageable);

    long countByStatus(String status);
}
