package com.ecommerce.user_service.service;

import com.ecommerce.user_service.dto.AdminReviewRequest;
import com.ecommerce.user_service.dto.SellerApplicationResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AdminSellerService {

    Page<SellerApplicationResponse> listApplications(String status, Pageable pageable);

    SellerApplicationResponse getApplication(String applicationId);

    SellerApplicationResponse approve(String applicationId, String adminId, AdminReviewRequest request);

    SellerApplicationResponse reject(String applicationId, String adminId, AdminReviewRequest request);
}
