package com.ecommerce.product.repository;

import com.ecommerce.product.entity.CommissionRate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommissionRateRepository extends JpaRepository<CommissionRate, String> {
}
