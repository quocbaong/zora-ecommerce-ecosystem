package com.ecommerce.user_service.repository;

import com.ecommerce.user_service.entity.SellerProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SellerProfileRepository extends JpaRepository<SellerProfile, String> {
}
