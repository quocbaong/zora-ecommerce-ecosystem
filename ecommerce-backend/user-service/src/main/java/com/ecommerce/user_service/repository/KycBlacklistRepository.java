package com.ecommerce.user_service.repository;

import com.ecommerce.user_service.entity.KycBlacklist;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KycBlacklistRepository extends JpaRepository<KycBlacklist, String> {

    boolean existsByTypeAndValue(String type, String value);
}
