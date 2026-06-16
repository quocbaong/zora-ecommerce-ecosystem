package com.ecommerce.order_service.service;

import com.ecommerce.order_service.dto.request.VoucherRequest;
import com.ecommerce.order_service.dto.response.VoucherResponse;
import com.ecommerce.order_service.entity.ShopVoucher;

import java.math.BigDecimal;
import java.util.List;

public interface VoucherService {
    List<VoucherResponse> listSellerVouchers(String sellerId);

    List<VoucherResponse> listShopActiveVouchers(String sellerId, String userId);

    List<VoucherResponse> listMySavedVouchers(String userId);

    List<VoucherResponse> listAllActiveVouchers(String userId);

    VoucherResponse create(String sellerId, VoucherRequest request);

    // Tạo voucher private (gửi qua chat) — chỉ targetUserId mới thấy/dùng được
    VoucherResponse createPrivate(String sellerId, String targetUserId, VoucherRequest request);

    // Lấy 1 voucher theo id, nếu userId truyền vào thì kèm cờ saved/expired/usedUp
    VoucherResponse getById(String voucherId, String userId);

    VoucherResponse update(String sellerId, String id, VoucherRequest request);

    void delete(String sellerId, String id);

    void save(String userId, String voucherId);

    void unsave(String userId, String voucherId);

    /**
     * Validate and compute discount for an order with the given voucher and item subtotals (per seller).
     * Returns the computed discount amount (>= 0).
     */
    BigDecimal computeDiscount(String voucherId, String sellerId, String userId, BigDecimal subtotalForSeller);

    void incrementUsage(String voucherId);

    ShopVoucher findById(String voucherId);
}
