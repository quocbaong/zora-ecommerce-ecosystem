package com.ecommerce.order_service.service.impl;

import com.ecommerce.order_service.dto.request.VoucherRequest;
import com.ecommerce.order_service.dto.response.VoucherResponse;
import com.ecommerce.order_service.entity.ShopVoucher;
import com.ecommerce.order_service.entity.UserSavedVoucher;
import com.ecommerce.order_service.repository.ShopVoucherRepository;
import com.ecommerce.order_service.repository.UserSavedVoucherRepository;
import com.ecommerce.order_service.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
@Service
@RequiredArgsConstructor
public class VoucherServiceImpl implements VoucherService {

    private final ShopVoucherRepository voucherRepository;
    private final UserSavedVoucherRepository savedRepository;

    @Override
    public List<VoucherResponse> listSellerVouchers(String sellerId) {
        return voucherRepository.findBySellerIdOrderByCreatedAtDesc(sellerId)
                .stream()
                .map(v -> toResponse(v, false))
                .toList();
    }

    @Override
    public List<VoucherResponse> listShopActiveVouchers(String sellerId, String userId) {
        List<ShopVoucher> vouchers = voucherRepository.findActiveBySellerId(sellerId, LocalDateTime.now());
        Set<String> savedIds = new HashSet<>();
        if (userId != null) {
            savedRepository.findByUserId(userId).forEach(s -> savedIds.add(s.getVoucherId()));
        }
        return vouchers.stream().map(v -> toResponse(v, savedIds.contains(v.getId()))).toList();
    }

    @Override
    public List<VoucherResponse> listMySavedVouchers(String userId) {
        List<UserSavedVoucher> saved = savedRepository.findByUserId(userId);
        return saved.stream()
                .map(s -> voucherRepository.findById(s.getVoucherId()).orElse(null))
                .filter(v -> v != null)
                .map(v -> toResponse(v, true))
                .toList();
    }

    @Override
    public List<VoucherResponse> listAllActiveVouchers(String userId) {
        List<ShopVoucher> activeVouchers = voucherRepository.findAllActivePublic(LocalDateTime.now());
        
        Set<String> savedIds = new HashSet<>();
        if (userId != null) {
            savedRepository.findByUserId(userId).forEach(s -> savedIds.add(s.getVoucherId()));
        }
        
        return activeVouchers.stream()
                .map(v -> toResponse(v, savedIds.contains(v.getId())))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public VoucherResponse create(String sellerId, VoucherRequest request) {
        validateRequest(request);
        ShopVoucher voucher = ShopVoucher.builder()
                .sellerId(sellerId)
                .code(request.getCode().toUpperCase())
                .title(request.getTitle())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .minOrderAmount(request.getMinOrderAmount() == null ? BigDecimal.ZERO : request.getMinOrderAmount())
                .maxDiscount(request.getMaxDiscount())
                .usageLimit(request.getUsageLimit())
                .usedCount(0)
                .expiresAt(request.getExpiresAt())
                .active(request.getActive() == null ? true : request.getActive())
                .build();
        return toResponse(voucherRepository.save(voucher), false);
    }

    @Override
    @Transactional
    public VoucherResponse createPrivate(String sellerId, String targetUserId, VoucherRequest request) {
        if (targetUserId == null || targetUserId.isBlank()) {
            throw new RuntimeException("TARGET_USER_REQUIRED");
        }
        validateRequest(request);
        ShopVoucher voucher = ShopVoucher.builder()
                .sellerId(sellerId)
                .targetUserId(targetUserId)
                .code(request.getCode().toUpperCase())
                .title(request.getTitle())
                .discountType(request.getDiscountType())
                .discountValue(request.getDiscountValue())
                .minOrderAmount(request.getMinOrderAmount() == null ? BigDecimal.ZERO : request.getMinOrderAmount())
                .maxDiscount(request.getMaxDiscount())
                .usageLimit(request.getUsageLimit())
                .usedCount(0)
                .expiresAt(request.getExpiresAt())
                .active(true)
                .build();
        return toResponse(voucherRepository.save(voucher), false);
    }

    @Override
    public VoucherResponse getById(String voucherId, String userId) {
        ShopVoucher v = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new RuntimeException("VOUCHER_NOT_FOUND"));
        // Private voucher: chỉ seller (chủ voucher) hoặc targetUserId mới được xem.
        // Trước đây seller cũng bị chặn vì chỉ check targetUserId → seller mở chat
        // sau khi gửi voucher private sẽ thấy card kẹt "Đang tải voucher...".
        if (v.getTargetUserId() != null
                && userId != null
                && !v.getTargetUserId().equals(userId)
                && !v.getSellerId().equals(userId)) {
            throw new RuntimeException("FORBIDDEN");
        }
        boolean saved = userId != null && savedRepository.existsByUserIdAndVoucherId(userId, voucherId);
        return toResponse(v, saved);
    }

    @Override
    @Transactional
    public VoucherResponse update(String sellerId, String id, VoucherRequest request) {
        validateRequest(request);
        ShopVoucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("VOUCHER_NOT_FOUND"));
        if (!voucher.getSellerId().equals(sellerId)) {
            throw new RuntimeException("FORBIDDEN");
        }
        voucher.setCode(request.getCode().toUpperCase());
        voucher.setTitle(request.getTitle());
        voucher.setDiscountType(request.getDiscountType());
        voucher.setDiscountValue(request.getDiscountValue());
        voucher.setMinOrderAmount(request.getMinOrderAmount() == null ? BigDecimal.ZERO : request.getMinOrderAmount());
        voucher.setMaxDiscount(request.getMaxDiscount());
        voucher.setUsageLimit(request.getUsageLimit());
        voucher.setExpiresAt(request.getExpiresAt());
        if (request.getActive() != null) {
            voucher.setActive(request.getActive());
        }
        return toResponse(voucherRepository.save(voucher), false);
    }

    @Override
    @Transactional
    public void delete(String sellerId, String id) {
        ShopVoucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("VOUCHER_NOT_FOUND"));
        if (!voucher.getSellerId().equals(sellerId)) {
            throw new RuntimeException("FORBIDDEN");
        }
        voucherRepository.delete(voucher);
    }

    @Override
    @Transactional
    public void save(String userId, String voucherId) {
        ShopVoucher v = voucherRepository.findById(voucherId)
                .orElseThrow(() -> new RuntimeException("VOUCHER_NOT_FOUND"));
        // Private voucher: chỉ targetUserId mới được lưu
        if (v.getTargetUserId() != null && !v.getTargetUserId().equals(userId)) {
            throw new RuntimeException("FORBIDDEN");
        }
        if (savedRepository.existsByUserIdAndVoucherId(userId, voucherId)) {
            return;
        }
        savedRepository.save(UserSavedVoucher.builder()
                .userId(userId)
                .voucherId(voucherId)
                .build());
    }

    @Override
    @Transactional
    public void unsave(String userId, String voucherId) {
        savedRepository.deleteByUserIdAndVoucherId(userId, voucherId);
    }

    @Override
    public BigDecimal computeDiscount(String voucherId, String sellerId, String userId, BigDecimal subtotalForSeller) {
        if (voucherId == null || subtotalForSeller == null) return BigDecimal.ZERO;
        ShopVoucher v = voucherRepository.findById(voucherId).orElse(null);
        if (v == null || !Boolean.TRUE.equals(v.getActive())) return BigDecimal.ZERO;
        if (!v.getSellerId().equals(sellerId)) return BigDecimal.ZERO;
        // Private voucher: chỉ targetUserId mới apply được
        if (v.getTargetUserId() != null && !v.getTargetUserId().equals(userId)) return BigDecimal.ZERO;
        // Phải được lưu trước mới được sử dụng
        if (userId != null && !savedRepository.existsByUserIdAndVoucherId(userId, voucherId)) return BigDecimal.ZERO;
        if (v.getExpiresAt() != null && v.getExpiresAt().isBefore(LocalDateTime.now())) return BigDecimal.ZERO;
        if (v.getUsageLimit() != null && v.getUsedCount() >= v.getUsageLimit()) return BigDecimal.ZERO;
        if (v.getMinOrderAmount() != null && subtotalForSeller.compareTo(v.getMinOrderAmount()) < 0) return BigDecimal.ZERO;

        BigDecimal discount;
        if ("PERCENT".equalsIgnoreCase(v.getDiscountType())) {
            discount = subtotalForSeller.multiply(v.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (v.getMaxDiscount() != null && discount.compareTo(v.getMaxDiscount()) > 0) {
                discount = v.getMaxDiscount();
            }
        } else {
            discount = v.getDiscountValue();
        }
        if (discount.compareTo(subtotalForSeller) > 0) discount = subtotalForSeller;
        return discount;
    }

    @Override
    @Transactional
    public void incrementUsage(String voucherId) {
        voucherRepository.findById(voucherId).ifPresent(v -> {
            v.setUsedCount(v.getUsedCount() + 1);
            voucherRepository.save(v);
        });
    }

    @Override
    public ShopVoucher findById(String voucherId) {
        return voucherRepository.findById(voucherId).orElse(null);
    }

    private void validateRequest(VoucherRequest req) {
        if (!"PERCENT".equalsIgnoreCase(req.getDiscountType()) && !"FIXED".equalsIgnoreCase(req.getDiscountType())) {
            throw new RuntimeException("INVALID_DISCOUNT_TYPE");
        }
        if (req.getDiscountValue().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("INVALID_DISCOUNT_VALUE");
        }
        if ("PERCENT".equalsIgnoreCase(req.getDiscountType())
                && req.getDiscountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new RuntimeException("PERCENT_EXCEEDS_100");
        }
    }

    private VoucherResponse toResponse(ShopVoucher v, boolean saved) {
        boolean expired = v.getExpiresAt() != null && v.getExpiresAt().isBefore(LocalDateTime.now());
        boolean usedUp = v.getUsageLimit() != null && v.getUsedCount() >= v.getUsageLimit();
        return VoucherResponse.builder()
                .id(v.getId())
                .sellerId(v.getSellerId())
                .targetUserId(v.getTargetUserId())
                .code(v.getCode())
                .title(v.getTitle())
                .discountType(v.getDiscountType())
                .discountValue(v.getDiscountValue())
                .minOrderAmount(v.getMinOrderAmount())
                .maxDiscount(v.getMaxDiscount())
                .usageLimit(v.getUsageLimit())
                .usedCount(v.getUsedCount())
                .expiresAt(v.getExpiresAt())
                .active(v.getActive())
                .saved(saved)
                .expired(expired)
                .usedUp(usedUp)
                .build();
    }
}
