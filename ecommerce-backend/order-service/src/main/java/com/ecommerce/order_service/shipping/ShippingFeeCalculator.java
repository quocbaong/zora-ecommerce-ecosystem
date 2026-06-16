package com.ecommerce.order_service.shipping;

import com.ecommerce.order_service.dto.request.OrderItemRequest;
import com.ecommerce.order_service.exception.CustomException;
import com.ecommerce.order_service.shipping.dto.ShippingFeeRequest;
import com.ecommerce.order_service.shipping.dto.ShippingFeeResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class ShippingFeeCalculator {

    private final RestTemplate restTemplate;
    private final GhnClient ghnClient;

    @Value("${services.user-url}")
    private String userServiceUrl;

    @Value("${services.product-url}")
    private String productServiceUrl;

    public double calculate(List<OrderItemRequest> items, Integer toDistrictId, String toWardCode) {
        if (toDistrictId == null || toWardCode == null || toWardCode.isBlank()) {
            throw new CustomException(
                    "Địa chỉ giao hàng chưa có thông tin GHN. Vui lòng chọn lại địa chỉ.",
                    HttpStatus.BAD_REQUEST);
        }
        if (items == null || items.isEmpty()) return 0.0;

        // Group items theo sellerId
        Map<String, List<OrderItemRequest>> bySeller = items.stream()
                .filter(i -> i.getSellerId() != null && !i.getSellerId().isBlank())
                .collect(Collectors.groupingBy(OrderItemRequest::getSellerId));

        if (bySeller.isEmpty()) {
            throw new CustomException(
                    "Sản phẩm không có thông tin shop, không thể tính phí ship",
                    HttpStatus.BAD_REQUEST);
        }

        double totalFee = 0;
        for (Map.Entry<String, List<OrderItemRequest>> entry : bySeller.entrySet()) {
            String sellerId = entry.getKey();
            List<OrderItemRequest> sellerItems = entry.getValue();

            // Lấy warehouse của seller
            WarehouseDto wh = fetchSellerWarehouse(sellerId);
            if (wh == null || !Boolean.TRUE.equals(wh.getConfigured())) {
                throw new CustomException(
                        "Shop chưa cấu hình kho hàng, không thể giao đến địa chỉ này",
                        HttpStatus.BAD_REQUEST);
            }

            // Tổng cân nặng + lấy dimension max (đơn giản: cộng dồn weight, dùng max dimensions)
            int totalWeight = 0;
            int maxLength = 10, maxWidth = 10, maxHeight = 10;
            for (OrderItemRequest item : sellerItems) {
                ProductDimensionDto p = fetchProductDimension(item.getProductId());
                int w = (p != null && p.getWeightG() != null) ? p.getWeightG() : 500;
                int l = (p != null && p.getLengthCm() != null) ? p.getLengthCm() : 20;
                int wd = (p != null && p.getWidthCm() != null) ? p.getWidthCm() : 15;
                int h = (p != null && p.getHeightCm() != null) ? p.getHeightCm() : 10;
                totalWeight += w * item.getQuantity();
                if (l > maxLength) maxLength = l;
                if (wd > maxWidth) maxWidth = wd;
                if (h > maxHeight) maxHeight = h;
            }
            if (totalWeight < 1) totalWeight = 500;

            ShippingFeeRequest feeReq = ShippingFeeRequest.builder()
                    .serviceTypeId(2)
                    .fromDistrictId(wh.getWarehouseGhnDistrictId())
                    .fromWardCode(wh.getWarehouseGhnWardCode())
                    .toDistrictId(toDistrictId)
                    .toWardCode(toWardCode)
                    .weight(totalWeight)
                    .length(maxLength)
                    .width(maxWidth)
                    .height(maxHeight)
                    .insuranceValue(0)
                    .build();
            ShippingFeeResponse feeResp = ghnClient.calculateFee(feeReq);
            if (feeResp != null && feeResp.getTotal() != null) {
                totalFee += feeResp.getTotal();
            }
        }
        return totalFee;
    }

    private WarehouseDto fetchSellerWarehouse(String sellerId) {
        try {
            return restTemplate.getForObject(
                    userServiceUrl + "/users/" + sellerId + "/warehouse",
                    WarehouseDto.class
            );
        } catch (Exception e) {
            log.error("Failed to fetch warehouse for seller {}: {}", sellerId, e.getMessage());
            throw new CustomException(
                    "Không lấy được thông tin kho của shop. Vui lòng thử lại.",
                    HttpStatus.BAD_GATEWAY);
        }
    }

    private ProductDimensionDto fetchProductDimension(String productId) {
        try {
            return restTemplate.getForObject(
                    productServiceUrl + "/products/" + productId,
                    ProductDimensionDto.class
            );
        } catch (Exception e) {
            log.warn("Failed to fetch product {}: {}", productId, e.getMessage());
            return null;
        }
    }

    @lombok.Data
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    static class WarehouseDto {
        private String sellerId;
        private Integer warehouseGhnProvinceId;
        private Integer warehouseGhnDistrictId;
        private String warehouseGhnWardCode;
        private Boolean configured;
    }

    @lombok.Data
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
    static class ProductDimensionDto {
        private String id;
        private Integer weightG;
        private Integer lengthCm;
        private Integer widthCm;
        private Integer heightCm;
    }
}
