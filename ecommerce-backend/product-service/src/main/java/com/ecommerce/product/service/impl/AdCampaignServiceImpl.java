package com.ecommerce.product.service.impl;

import com.ecommerce.product.dto.request.AdCampaignCreateRequest;
import com.ecommerce.product.dto.response.AdCampaignResponse;
import com.ecommerce.product.entity.AdCampaign;
import com.ecommerce.product.entity.AdCampaignStatus;
import com.ecommerce.product.kafka.event.AdCampaignDecidedEvent;
import com.ecommerce.product.kafka.producer.AdCampaignEventProducer;
import com.ecommerce.product.repository.AdCampaignRepository;
import com.ecommerce.product.service.AdCampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdCampaignServiceImpl implements AdCampaignService {

    private final AdCampaignRepository repository;
    private final AdCampaignEventProducer eventProducer;

    @Override
    @Transactional
    public AdCampaignResponse create(String sellerId, AdCampaignCreateRequest req) {
        if (req.getEndDate().isBefore(req.getStartDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
        }
        if (req.getStartDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ngày bắt đầu không được ở quá khứ");
        }
        AdCampaign saved = repository.save(AdCampaign.builder()
                .sellerId(sellerId)
                .title(req.getTitle())
                .description(req.getDescription())
                .bannerUrl(req.getBannerUrl())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .status(AdCampaignStatus.PENDING)
                .build());
        return toResponse(saved);
    }

    @Override
    public List<AdCampaignResponse> getMyCampaigns(String sellerId) {
        return repository.findBySellerIdOrderByCreatedAtDesc(sellerId).stream()
                .map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public void cancelMy(String sellerId, String campaignId) {
        AdCampaign c = repository.findById(campaignId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign không tồn tại"));
        if (!c.getSellerId().equals(sellerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không phải campaign của bạn");
        }
        if (c.getStatus() != AdCampaignStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Chỉ huỷ được campaign đang chờ duyệt");
        }
        repository.delete(c);
    }

    @Override
    public Page<AdCampaignResponse> listForAdmin(String status, Pageable pageable) {
        AdCampaignStatus s = (status == null || status.isBlank())
                ? AdCampaignStatus.PENDING
                : AdCampaignStatus.valueOf(status.toUpperCase());
        return repository.findByStatusOrderByCreatedAtDesc(s, pageable).map(this::toResponse);
    }

    @Override
    @Transactional
    public AdCampaignResponse approve(String adminId, String campaignId) {
        AdCampaign c = repository.findById(campaignId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign không tồn tại"));
        if (c.getStatus() != AdCampaignStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Campaign không ở trạng thái chờ duyệt");
        }
        c.setStatus(AdCampaignStatus.APPROVED);
        c.setRejectionReason(null);
        c.setReviewedAt(LocalDateTime.now());
        c.setReviewedBy(adminId);
        AdCampaign saved = repository.save(c);
        eventProducer.sendDecided(AdCampaignDecidedEvent.builder()
                .campaignId(saved.getId())
                .sellerId(saved.getSellerId())
                .title(saved.getTitle())
                .status("APPROVED")
                .build());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public AdCampaignResponse reject(String adminId, String campaignId, String reason) {
        AdCampaign c = repository.findById(campaignId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign không tồn tại"));
        if (c.getStatus() != AdCampaignStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Campaign không ở trạng thái chờ duyệt");
        }
        c.setStatus(AdCampaignStatus.REJECTED);
        c.setRejectionReason(reason);
        c.setReviewedAt(LocalDateTime.now());
        c.setReviewedBy(adminId);
        AdCampaign saved = repository.save(c);
        eventProducer.sendDecided(AdCampaignDecidedEvent.builder()
                .campaignId(saved.getId())
                .sellerId(saved.getSellerId())
                .title(saved.getTitle())
                .status("REJECTED")
                .reason(reason)
                .build());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public AdCampaignResponse forceStop(String adminId, String campaignId, String reason) {
        AdCampaign c = repository.findById(campaignId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Campaign không tồn tại"));
        if (c.getStatus() != AdCampaignStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ buộc dừng được campaign đang chạy");
        }
        c.setStatus(AdCampaignStatus.FORCE_STOPPED);
        c.setRejectionReason(reason);
        c.setReviewedAt(LocalDateTime.now());
        c.setReviewedBy(adminId);
        AdCampaign saved = repository.save(c);
        eventProducer.sendDecided(AdCampaignDecidedEvent.builder()
                .campaignId(saved.getId())
                .sellerId(saved.getSellerId())
                .title(saved.getTitle())
                .status("FORCE_STOPPED")
                .reason(reason)
                .build());
        return toResponse(saved);
    }

    @Override
    public List<AdCampaignResponse> getActive() {
        return repository.findActiveOn(LocalDate.now()).stream()
                .map(this::toResponse).toList();
    }

    private AdCampaignResponse toResponse(AdCampaign c) {
        return AdCampaignResponse.builder()
                .id(c.getId())
                .sellerId(c.getSellerId())
                .title(c.getTitle())
                .description(c.getDescription())
                .bannerUrl(c.getBannerUrl())
                .startDate(c.getStartDate())
                .endDate(c.getEndDate())
                .status(c.getStatus())
                .rejectionReason(c.getRejectionReason())
                .createdAt(c.getCreatedAt())
                .reviewedAt(c.getReviewedAt())
                .build();
    }
}
