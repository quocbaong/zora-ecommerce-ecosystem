package com.ecommerce.ai_service.service.tool;

import com.ecommerce.ai_service.client.OrderServiceClient;
import com.ecommerce.ai_service.client.ProductServiceClient;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class SellerChatTools {

    private final OrderServiceClient orderClient;
    private final ProductServiceClient productClient;

    @Tool(description = "Lấy thống kê tổng quan shop: tổng đơn, doanh thu, đơn mới hôm nay.")
    public Map<String, Object> getSellerStats(ToolContext ctx) {
        return orderClient.getSellerStats(userId(ctx));
    }

    @Tool(description = "Lấy doanh thu theo ngày hoặc tháng. range = 'day' hoặc 'month'.")
    public Map<String, Object> getSellerRevenue(
            @ToolParam(description = "Khoảng thời gian: 'day' hoặc 'month'") String range,
            ToolContext ctx) {
        return orderClient.getSellerRevenue(userId(ctx), range != null ? range : "day");
    }

    @Tool(description = "Lấy danh sách đơn hàng của shop cần xử lý.")
    public Map<String, Object> getSellerOrders(ToolContext ctx) {
        return orderClient.getSellerOrders(userId(ctx));
    }

    @Tool(description = "Lấy top 5 sản phẩm bán chạy nhất của shop.")
    public Map<String, Object> getSellerTopProducts(ToolContext ctx) {
        return orderClient.getSellerTopProducts(userId(ctx));
    }

    @Tool(description = "Tìm kiếm sản phẩm theo từ khóa.")
    public Map<String, Object> searchProducts(
            @ToolParam(description = "Từ khóa tìm kiếm", required = true) String keyword,
            ToolContext ctx) {
        return productClient.searchProducts(keyword, null, null, null);
    }

    @Tool(description = "Cập nhật trạng thái đơn hàng (ví dụ: chuyển sang đang giao).")
    public Map<String, Object> updateOrderStatus(
            @ToolParam(description = "Mã đơn hàng", required = true) String orderId,
            @ToolParam(description = "Trạng thái mới (CONFIRMED, SHIPPING, DELIVERED, CANCELLED)", required = true) String status,
            ToolContext ctx) {
        if (isBlank(orderId)) return missing("orderId", "mã đơn hàng cần cập nhật");
        if (isBlank(status)) return missing("status", "trạng thái mới (CONFIRMED/SHIPPING/DELIVERED/CANCELLED)");
        String s = status.trim().toUpperCase();
        if (!s.equals("CONFIRMED") && !s.equals("SHIPPING") && !s.equals("DELIVERED") && !s.equals("CANCELLED")) {
            return Map.of("error", "INVALID_STATUS",
                    "message", "Trạng thái không hợp lệ. Chỉ chấp nhận: CONFIRMED, SHIPPING, DELIVERED, CANCELLED.");
        }
        return orderClient.updateOrderStatus(orderId.trim(), s, userId(ctx));
    }

    @Tool(description = "Cập nhật giá bán của một sản phẩm.")
    public Map<String, Object> updateProductPrice(
            @ToolParam(description = "Mã sản phẩm", required = true) String productId,
            @ToolParam(description = "Giá mới (VNĐ, số dương)", required = true) String price,
            ToolContext ctx) {
        if (isBlank(productId)) return missing("productId", "mã sản phẩm cần đổi giá");
        if (isBlank(price)) return missing("price", "giá mới (VNĐ)");
        Double p = parseDouble(price);
        if (p == null || p <= 0) {
            return Map.of("error", "INVALID_PRICE",
                    "message", "Giá không hợp lệ. Hãy hỏi lại Seller giá mới là bao nhiêu (số dương, VNĐ).");
        }
        return productClient.updateProduct(productId.trim(), Map.of("price", p), userId(ctx));
    }

    @Tool(description = "Cập nhật số lượng tồn kho của một sản phẩm.")
    public Map<String, Object> updateProductStock(
            @ToolParam(description = "Mã sản phẩm", required = true) String productId,
            @ToolParam(description = "Số lượng tồn kho mới (số nguyên >= 0)", required = true) String stock,
            ToolContext ctx) {
        if (isBlank(productId)) return missing("productId", "mã sản phẩm cần cập nhật tồn kho");
        if (isBlank(stock)) return missing("stock", "số lượng tồn kho mới");
        Integer s = parseInt(stock);
        if (s == null || s < 0) {
            return Map.of("error", "INVALID_STOCK",
                    "message", "Số lượng tồn kho không hợp lệ. Hãy hỏi lại Seller số lượng là bao nhiêu (số nguyên >= 0).");
        }
        return productClient.updateProduct(productId.trim(), Map.of("stock", s), userId(ctx));
    }

    @Tool(description = "Đổi trạng thái của một sản phẩm (tạm ngưng bán hoặc mở bán lại).")
    public Map<String, Object> toggleProductStatus(
            @ToolParam(description = "Mã sản phẩm", required = true) String productId,
            @ToolParam(description = "Trạng thái mới: 'DISABLED' (Ngưng bán) hoặc 'ACTIVE' (Đang bán)", required = true) String status,
            ToolContext ctx) {
        if (isBlank(productId)) return missing("productId", "mã sản phẩm cần đổi trạng thái");
        if (isBlank(status)) return missing("status", "trạng thái mới (ACTIVE hoặc DISABLED)");
        String s = status.trim().toUpperCase();
        if (s.equals("DISABLED")) {
            return productClient.disableProduct(productId.trim(), userId(ctx));
        }
        if (s.equals("ACTIVE")) {
            return productClient.updateProduct(productId.trim(), Map.of("status", "ACTIVE"), userId(ctx));
        }
        return Map.of("error", "INVALID_STATUS",
                "message", "Trạng thái không hợp lệ. Chỉ chấp nhận: ACTIVE hoặc DISABLED.");
    }

    private String userId(ToolContext ctx) {
        return ctx.getContext().get("userId").toString();
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private Map<String, Object> missing(String field, String description) {
        return Map.of(
                "error", "MISSING_FIELD",
                "field", field,
                "message", "Thiếu thông tin: " + description + ". Hãy hỏi lại Seller để lấy đủ thông tin trước khi gọi tool."
        );
    }

    private Double parseDouble(String value) {
        try {
            return Double.parseDouble(value.trim().replace(",", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer parseInt(String value) {
        try {
            return Integer.parseInt(value.trim().replace(",", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
