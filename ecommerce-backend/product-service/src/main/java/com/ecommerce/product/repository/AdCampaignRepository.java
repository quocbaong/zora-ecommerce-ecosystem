package com.ecommerce.product.repository;

import com.ecommerce.product.entity.AdCampaign;
import com.ecommerce.product.entity.AdCampaignStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface AdCampaignRepository extends JpaRepository<AdCampaign, String> {

    List<AdCampaign> findBySellerIdOrderByCreatedAtDesc(String sellerId);

    Page<AdCampaign> findByStatusOrderByCreatedAtDesc(AdCampaignStatus status, Pageable pageable);

    @Query("SELECT c FROM AdCampaign c WHERE c.status = 'APPROVED' " +
            "AND :today BETWEEN c.startDate AND c.endDate " +
            "ORDER BY c.createdAt DESC")
    List<AdCampaign> findActiveOn(@Param("today") LocalDate today);
}
