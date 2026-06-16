package com.ecommerce.user_service.service.impl;

import com.ecommerce.user_service.dto.AdminReviewRequest;
import com.ecommerce.user_service.dto.SellerApplicationResponse;
import com.ecommerce.user_service.entity.AuditLog;
import com.ecommerce.user_service.entity.SellerApplication;
import com.ecommerce.user_service.entity.SellerProfile;
import com.ecommerce.user_service.exception.ResourceNotFoundException;
import com.ecommerce.user_service.kafka.event.SellerApplicationDecidedEvent;
import com.ecommerce.user_service.kafka.producer.SellerApplicationEventProducer;
import com.ecommerce.user_service.repository.AuditLogRepository;
import com.ecommerce.user_service.repository.SellerApplicationRepository;
import com.ecommerce.user_service.repository.SellerProfileRepository;
import com.ecommerce.user_service.repository.UserRepository;
import com.ecommerce.user_service.service.AdminSellerService;
import com.ecommerce.user_service.service.SellerEmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminSellerServiceImpl implements AdminSellerService {

    private final SellerApplicationRepository applicationRepository;
    private final SellerProfileRepository sellerProfileRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final SellerApplicationEventProducer eventProducer;
    private final SellerEmailService emailService;

    @Value("${services.auth-url}")
    private String authServiceUrl;

    @Override
    public Page<SellerApplicationResponse> listApplications(String status, Pageable pageable) {
        Page<SellerApplication> page = (status != null && !status.isBlank())
                ? applicationRepository.findByStatus(status, pageable)
                : applicationRepository.findAll(pageable);
        return page.map(this::toResponse);
    }

    @Override
    public SellerApplicationResponse getApplication(String applicationId) {
        return toResponse(findById(applicationId));
    }

    @Override
    @Transactional
    public SellerApplicationResponse approve(String applicationId, String adminId, AdminReviewRequest req) {
        SellerApplication app = findById(applicationId);
        if (!"PENDING".equals(app.getStatus())) {
            throw new IllegalStateException("Application is not in PENDING status");
        }

        // 1. Update auth-service: set role = SELLER
        updateRoleInAuthService(app.getUserId(), "SELLER");

        // 1b. Update user-service users table so admin list shows correct role
        userRepository.findByUserId(app.getUserId()).ifPresent(u -> {
            u.setRole("SELLER");
            userRepository.save(u);
        });

        // 2. Create SellerProfile
        if (!sellerProfileRepository.existsById(app.getUserId())) {
            sellerProfileRepository.save(SellerProfile.builder()
                    .sellerId(app.getUserId())
                    .shopName(app.getShopName())
                    .shopDescription(app.getShopDescription())
                    .accountType(app.getAccountType())
                    .taxCode(app.getTaxCode())
                    .bankName(app.getBankName())
                    .bankAccount(app.getBankAccount())
                    .bankHolder(app.getBankHolder())
                    .warehouseStreet(app.getWarehouseStreet())
                    .warehouseProvince(app.getWarehouseProvince())
                    .warehouseDistrict(app.getWarehouseDistrict())
                    .warehouseWard(app.getWarehouseWard())
                    .warehouseGhnProvinceId(app.getWarehouseGhnProvinceId())
                    .warehouseGhnDistrictId(app.getWarehouseGhnDistrictId())
                    .warehouseGhnWardCode(app.getWarehouseGhnWardCode())
                    .build());
        }

        // 3. Update application status
        app.setStatus("APPROVED");
        app.setReviewedBy(adminId);
        app.setReviewedAt(LocalDateTime.now());
        if (req != null) app.setAdminNotes(req.getAdminNotes());
        SellerApplication saved = applicationRepository.save(app);

        // 4. Ghi audit log
        auditLogRepository.save(AuditLog.builder()
                .adminId(adminId)
                .action("APPROVE_SELLER")
                .targetType("SELLER_APPLICATION")
                .targetId(applicationId)
                .oldValue("{\"status\":\"PENDING\"}")
                .newValue("{\"status\":\"APPROVED\",\"userId\":\"" + app.getUserId() + "\"}")
                .build());

        // 5. Lấy email user để gửi notify
        String userEmail = userRepository.findByUserId(app.getUserId())
                .map(u -> u.getEmail()).orElse(null);

        // 6. Gửi email
        if (userEmail != null) {
            emailService.sendApprovedEmail(userEmail, app.getShopName());
        }

        // 7. Publish Kafka → notification-service gửi in-app
        eventProducer.sendDecidedEvent(SellerApplicationDecidedEvent.builder()
                .userId(app.getUserId())
                .userEmail(userEmail)
                .status("APPROVED")
                .shopName(app.getShopName())
                .build());

        log.info("[ADMIN] Approved seller application id={} userId={} by adminId={}", applicationId, app.getUserId(), adminId);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public SellerApplicationResponse reject(String applicationId, String adminId, AdminReviewRequest req) {
        SellerApplication app = findById(applicationId);
        if (!"PENDING".equals(app.getStatus())) {
            throw new IllegalStateException("Application is not in PENDING status");
        }

        app.setStatus("REJECTED");
        app.setReviewedBy(adminId);
        app.setReviewedAt(LocalDateTime.now());
        if (req != null) {
            app.setRejectionReason(req.getReason());
            app.setAdminNotes(req.getAdminNotes());
        }
        SellerApplication saved = applicationRepository.save(app);

        auditLogRepository.save(AuditLog.builder()
                .adminId(adminId)
                .action("REJECT_SELLER")
                .targetType("SELLER_APPLICATION")
                .targetId(applicationId)
                .oldValue("{\"status\":\"PENDING\"}")
                .newValue("{\"status\":\"REJECTED\",\"reason\":\"" + (req != null ? req.getReason() : "") + "\"}")
                .reason(req != null ? req.getReason() : null)
                .build());

        // Lấy email + gửi notify
        String userEmail = userRepository.findByUserId(app.getUserId())
                .map(u -> u.getEmail()).orElse(null);

        if (userEmail != null) {
            emailService.sendRejectedEmail(userEmail, app.getShopName(), req != null ? req.getReason() : null);
        }

        eventProducer.sendDecidedEvent(SellerApplicationDecidedEvent.builder()
                .userId(app.getUserId())
                .userEmail(userEmail)
                .status("REJECTED")
                .shopName(app.getShopName())
                .reason(req != null ? req.getReason() : null)
                .build());

        log.info("[ADMIN] Rejected seller application id={} userId={} by adminId={}", applicationId, app.getUserId(), adminId);
        return toResponse(saved);
    }

    private void updateRoleInAuthService(String userId, String role) {
        try {
            String url = authServiceUrl + "/auth/internal/users/" + userId + "/role";
            restTemplate.put(url, Map.of("role", role));
        } catch (Exception e) {
            log.error("[ADMIN] Failed to update role for userId={}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Failed to update user role in auth-service");
        }
    }

    private SellerApplication findById(String id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Seller application not found: " + id));
    }

    private SellerApplicationResponse toResponse(SellerApplication app) {
        return SellerApplicationResponse.builder()
                .id(app.getId())
                .userId(app.getUserId())
                .status(app.getStatus())
                .shopName(app.getShopName())
                .shopDescription(app.getShopDescription())
                .mainCategory(app.getMainCategory())
                .warehouseAddress(app.getWarehouseAddress())
                .warehouseStreet(app.getWarehouseStreet())
                .warehouseProvince(app.getWarehouseProvince())
                .warehouseDistrict(app.getWarehouseDistrict())
                .warehouseWard(app.getWarehouseWard())
                .warehouseGhnProvinceId(app.getWarehouseGhnProvinceId())
                .warehouseGhnDistrictId(app.getWarehouseGhnDistrictId())
                .warehouseGhnWardCode(app.getWarehouseGhnWardCode())
                .accountType(app.getAccountType())
                .fullName(app.getFullName())
                .idNumber(app.getIdNumber())
                .idFrontUrl(app.getIdFrontUrl())
                .idBackUrl(app.getIdBackUrl())
                .selfieUrl(app.getSelfieUrl())
                .bankName(app.getBankName())
                .bankAccount(app.getBankAccount())
                .bankHolder(app.getBankHolder())
                .bankBranch(app.getBankBranch())
                .bankNameMatch(app.getBankNameMatch())
                .ocrMatch(app.getOcrMatch())
                .ocrFullName(app.getOcrFullName())
                .ocrIdNumber(app.getOcrIdNumber())
                .rejectionReason(app.getRejectionReason())
                .resubmitCount(app.getResubmitCount())
                .createdAt(app.getCreatedAt())
                .updatedAt(app.getUpdatedAt())
                .build();
    }
}
