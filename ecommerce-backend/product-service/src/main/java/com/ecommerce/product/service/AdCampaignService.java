package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.AdCampaignCreateRequest;
import com.ecommerce.product.dto.response.AdCampaignResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AdCampaignService {

    AdCampaignResponse create(String sellerId, AdCampaignCreateRequest req);

    List<AdCampaignResponse> getMyCampaigns(String sellerId);

    void cancelMy(String sellerId, String campaignId);

    Page<AdCampaignResponse> listForAdmin(String status, Pageable pageable);

    AdCampaignResponse approve(String adminId, String campaignId);

    AdCampaignResponse reject(String adminId, String campaignId, String reason);

    AdCampaignResponse forceStop(String adminId, String campaignId, String reason);

    List<AdCampaignResponse> getActive();
}
