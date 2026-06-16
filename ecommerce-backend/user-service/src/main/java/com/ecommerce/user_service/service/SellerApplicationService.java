package com.ecommerce.user_service.service;

import com.ecommerce.user_service.dto.SellerApplicationRequest;
import com.ecommerce.user_service.dto.SellerApplicationResponse;

public interface SellerApplicationService {

    SellerApplicationResponse submit(String userId, SellerApplicationRequest request, String clientIp);

    SellerApplicationResponse getMyApplication(String userId);
}
