package com.ecommerce.user_service.service.impl;

import com.ecommerce.user_service.dto.OcrResult;
import com.ecommerce.user_service.dto.SellerApplicationRequest;
import com.ecommerce.user_service.dto.SellerApplicationResponse;
import com.ecommerce.user_service.entity.SellerApplication;
import com.ecommerce.user_service.exception.ResourceNotFoundException;
import com.ecommerce.user_service.repository.KycBlacklistRepository;
import com.ecommerce.user_service.repository.SellerApplicationRepository;
import com.ecommerce.user_service.service.OcrService;
import com.ecommerce.user_service.service.SellerApplicationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;

@Service
@RequiredArgsConstructor
@Slf4j
public class SellerApplicationServiceImpl implements SellerApplicationService {

    private final SellerApplicationRepository applicationRepository;
    private final KycBlacklistRepository blacklistRepository;
    private final OcrService ocrService;

    @Override
    @Transactional
    public SellerApplicationResponse submit(String userId, SellerApplicationRequest req, String clientIp) {
        // Không cho phép nộp lại khi đang PENDING hoặc đã APPROVED
        applicationRepository.findByUserId(userId).ifPresent(existing -> {
            String status = existing.getStatus();
            if ("PENDING".equals(status) || "APPROVED".equals(status)) {
                throw new IllegalStateException("APPLICATION_ALREADY_EXISTS");
            }
            if (existing.getResubmitCount() >= 3) {
                throw new IllegalStateException("RESUBMIT_LIMIT_EXCEEDED");
            }
        });

        // Kiểm tra CCCD bị blacklist
        if (blacklistRepository.existsByTypeAndValue("CCCD", req.getIdNumber())) {
            throw new IllegalStateException("ID_NUMBER_BLACKLISTED");
        }
        if (req.getTaxCode() != null && blacklistRepository.existsByTypeAndValue("TAX_CODE", req.getTaxCode())) {
            throw new IllegalStateException("TAX_CODE_BLACKLISTED");
        }

        // Báo lỗi sớm nếu CCCD/mã số thuế đã thuộc về user khác (loại trừ chính bản ghi của user hiện tại)
        if (req.getIdNumber() != null && !req.getIdNumber().isBlank()
                && applicationRepository.existsByIdNumberAndUserIdNot(req.getIdNumber(), userId)) {
            throw new IllegalStateException("ID_NUMBER_ALREADY_USED");
        }
        if (req.getTaxCode() != null && !req.getTaxCode().isBlank()
                && applicationRepository.existsByTaxCodeAndUserIdNot(req.getTaxCode(), userId)) {
            throw new IllegalStateException("TAX_CODE_ALREADY_USED");
        }

        // So sánh sau khi chuẩn hoá: bỏ dấu, viết hoa, bỏ khoảng trắng thừa
        boolean bankNameMatch = normalize(req.getFullName()).equals(normalize(req.getBankHolder()));

        SellerApplication existing = applicationRepository.findByUserId(userId).orElse(null);

        // Nếu user resubmit và giữ nguyên ảnh CCCD cũ (vd: admin chỉ yêu cầu đổi tên shop) →
        // tin giá trị OCR đã quét và lưu trước đó, không cần gọi OCR lại.
        boolean reuseStoredOcr = existing != null
                && existing.getIdFrontUrl() != null
                && existing.getIdFrontUrl().equals(req.getIdFrontUrl())
                && existing.getIdNumber() != null
                && !existing.getIdNumber().isBlank();

        String serverOcrFullName;
        String serverOcrIdNumber;
        Boolean ocrMatch;
        String effectiveIdNumber;
        String effectiveFullName;

        if (reuseStoredOcr) {
            log.info("[OCR] Bỏ qua quét OCR — user giữ nguyên ảnh CCCD cũ");
            serverOcrFullName = existing.getOcrFullName();
            serverOcrIdNumber = existing.getOcrIdNumber();
            ocrMatch = existing.getOcrMatch();
            effectiveIdNumber = existing.getIdNumber();
            effectiveFullName = existing.getFullName();
        } else if (req.getIdFrontUrl() != null && !req.getIdFrontUrl().isBlank()) {
            // Gọi OCR server-side từ ảnh CCCD mặt trước — không tin giá trị client gửi lên.
            // Nếu OCR fail (ảnh không phải CCCD / không đọc được) → reject ngay, không lưu đơn.
            OcrResult ocr = ocrService.extractCccdInfo(req.getIdFrontUrl());
            if (!ocr.isSuccess() || ocr.getIdNumber() == null || ocr.getIdNumber().isBlank()) {
                log.warn("[OCR] OCR failed: {}", ocr.getErrorMessage());
                throw new IllegalStateException("INVALID_CCCD_IMAGE");
            }
            serverOcrFullName = ocr.getFullName();
            serverOcrIdNumber = ocr.getIdNumber();
            boolean nameMatch = normalize(req.getFullName()).equals(normalize(ocr.getFullName()));
            boolean idMatch = normalize(req.getIdNumber()).equals(normalize(ocr.getIdNumber()));
            ocrMatch = nameMatch && idMatch;
            effectiveIdNumber = req.getIdNumber();
            effectiveFullName = req.getFullName();
            log.info("[OCR] nameMatch={} idMatch={} → ocrMatch={}", nameMatch, idMatch, ocrMatch);
        } else {
            serverOcrFullName = null;
            serverOcrIdNumber = null;
            ocrMatch = null;
            effectiveIdNumber = req.getIdNumber();
            effectiveFullName = req.getFullName();
        }

        SellerApplication application;
        if (existing != null) {
            // Resubmit — cập nhật đơn cũ
            existing.setStatus("PENDING");
            existing.setShopName(req.getShopName());
            existing.setShopDescription(req.getShopDescription());
            existing.setMainCategory(req.getMainCategory());
            existing.setWarehouseAddress(buildWarehouseAddress(req));
            existing.setWarehouseStreet(req.getWarehouseStreet());
            existing.setWarehouseProvince(req.getWarehouseProvince());
            existing.setWarehouseDistrict(req.getWarehouseDistrict());
            existing.setWarehouseWard(req.getWarehouseWard());
            existing.setWarehouseGhnProvinceId(req.getWarehouseGhnProvinceId());
            existing.setWarehouseGhnDistrictId(req.getWarehouseGhnDistrictId());
            existing.setWarehouseGhnWardCode(req.getWarehouseGhnWardCode());
            existing.setAccountType(req.getAccountType());
            existing.setFullName(effectiveFullName);
            existing.setIdNumber(effectiveIdNumber);
            existing.setIdFrontUrl(req.getIdFrontUrl());
            existing.setIdBackUrl(req.getIdBackUrl());
            existing.setSelfieUrl(req.getSelfieUrl());
            existing.setDateOfBirth(req.getDateOfBirth());
            existing.setPermanentAddress(req.getPermanentAddress());
            existing.setBusinessName(req.getBusinessName());
            existing.setTaxCode(req.getTaxCode());
            existing.setBusinessLicenseUrl(req.getBusinessLicenseUrl());
            existing.setBankName(req.getBankName());
            existing.setBankAccount(req.getBankAccount());
            existing.setBankHolder(req.getBankHolder());
            existing.setBankBranch(req.getBankBranch());
            existing.setBankNameMatch(bankNameMatch);
            existing.setOcrMatch(ocrMatch);
            existing.setOcrFullName(serverOcrFullName);
            existing.setOcrIdNumber(serverOcrIdNumber);
            existing.setRejectionReason(null);
            existing.setResubmitCount(existing.getResubmitCount() + 1);
            application = applicationRepository.save(existing);
        } else {
            application = applicationRepository.save(SellerApplication.builder()
                    .userId(userId)
                    .status("PENDING")
                    .shopName(req.getShopName())
                    .shopDescription(req.getShopDescription())
                    .mainCategory(req.getMainCategory())
                    .warehouseAddress(buildWarehouseAddress(req))
                    .warehouseStreet(req.getWarehouseStreet())
                    .warehouseProvince(req.getWarehouseProvince())
                    .warehouseDistrict(req.getWarehouseDistrict())
                    .warehouseWard(req.getWarehouseWard())
                    .warehouseGhnProvinceId(req.getWarehouseGhnProvinceId())
                    .warehouseGhnDistrictId(req.getWarehouseGhnDistrictId())
                    .warehouseGhnWardCode(req.getWarehouseGhnWardCode())
                    .accountType(req.getAccountType())
                    .fullName(effectiveFullName)
                    .idNumber(effectiveIdNumber)
                    .idFrontUrl(req.getIdFrontUrl())
                    .idBackUrl(req.getIdBackUrl())
                    .selfieUrl(req.getSelfieUrl())
                    .dateOfBirth(req.getDateOfBirth())
                    .permanentAddress(req.getPermanentAddress())
                    .businessName(req.getBusinessName())
                    .taxCode(req.getTaxCode())
                    .businessLicenseUrl(req.getBusinessLicenseUrl())
                    .bankName(req.getBankName())
                    .bankAccount(req.getBankAccount())
                    .bankHolder(req.getBankHolder())
                    .bankBranch(req.getBankBranch())
                    .bankNameMatch(bankNameMatch)
                    .ocrFullName(serverOcrFullName)
                    .ocrIdNumber(serverOcrIdNumber)
                    .ocrMatch(ocrMatch)
                    .submittedIp(clientIp)
                    .build());
        }

        log.info("[SELLER_APP] userId={} submitted application id={}", userId, application.getId());
        return toResponse(application);
    }

    @Override
    public SellerApplicationResponse getMyApplication(String userId) {
        SellerApplication app = applicationRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No application found for user: " + userId));
        return toResponse(app);
    }

    // Chuẩn hoá tên: bỏ dấu tiếng Việt, viết hoa, bỏ khoảng trắng thừa
    // "Bùi Mạnh Hiếu" → "BUI MANH HIEU", "BUI MANH HIEU" → "BUI MANH HIEU"
    private String buildWarehouseAddress(SellerApplicationRequest req) {
        if (req.getWarehouseStreet() != null && req.getWarehouseProvince() != null) {
            return String.join(", ",
                    req.getWarehouseStreet(),
                    req.getWarehouseWard() != null ? req.getWarehouseWard() : "",
                    req.getWarehouseDistrict() != null ? req.getWarehouseDistrict() : "",
                    req.getWarehouseProvince()
            ).replaceAll(", ,", ",").replaceAll(",\\s*$", "");
        }
        return req.getWarehouseAddress();
    }

    private String normalize(String s) {
        if (s == null) return "";
        String replaced = s.trim()
                .replace('đ', 'd').replace('Đ', 'D');
        String decomposed = Normalizer.normalize(replaced, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{InCombiningDiacriticalMarks}", "")
                .replaceAll("\\s+", " ")
                .toUpperCase();
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
                .taxCode(app.getTaxCode())
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
