package com.ecommerce.ai_service.service.tool;

import com.ecommerce.ai_service.client.CartServiceClient;
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
public class UserChatTools {

    private final OrderServiceClient orderClient;
    private final ProductServiceClient productClient;
    private final CartServiceClient cartClient;

    @Tool(description = "Tìm kiếm sản phẩm theo từ khóa. Dùng khi user muốn tìm mua gì đó.")
    public Map<String, Object> searchProducts(
            @ToolParam(description = "Từ khóa tìm kiếm", required = true) String keyword,
            @ToolParam(description = "Giá tối thiểu (VNĐ), để trống nếu không lọc") String minPrice,
            @ToolParam(description = "Giá tối đa (VNĐ), để trống nếu không lọc") String maxPrice,
            ToolContext ctx) {
        return productClient.searchProducts(keyword, null, parseDouble(minPrice), parseDouble(maxPrice));
    }

    private Double parseDouble(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @Tool(description = "Lấy chi tiết một sản phẩm theo ID.")
    public Map<String, Object> getProductDetail(
            @ToolParam(description = "ID sản phẩm", required = true) String productId,
            ToolContext ctx) {
        if (productId == null || productId.trim().isEmpty()) {
            return Map.of(
                    "error", "MISSING_FIELD",
                    "field", "productId",
                    "message", "Thiếu mã sản phẩm. Hãy hỏi lại user xem họ muốn xem sản phẩm nào (gợi ý dùng searchProducts trước)."
            );
        }
        return productClient.getProductDetail(productId.trim());
    }

    @Tool(description = "Lấy danh sách đơn hàng gần nhất của user. Dùng khi user hỏi về đơn hàng, vận chuyển.")
    public Map<String, Object> getMyOrders(ToolContext ctx) {
        return orderClient.getMyOrders(userId(ctx));
    }

    @Tool(description = "Lấy chi tiết một đơn hàng cụ thể theo mã đơn.")
    public Map<String, Object> getOrderDetail(
            @ToolParam(description = "Mã đơn hàng (orderId)", required = true) String orderId,
            ToolContext ctx) {
        if (orderId == null || orderId.trim().isEmpty()) {
            return Map.of(
                    "error", "MISSING_FIELD",
                    "field", "orderId",
                    "message", "Thiếu mã đơn hàng. Hãy hỏi lại user mã đơn cần xem (gợi ý dùng getMyOrders trước để xem danh sách)."
            );
        }
        return orderClient.getOrderDetail(orderId.trim(), userId(ctx));
    }

    @Tool(description = "Xem giỏ hàng hiện tại của user.")
    public Map<String, Object> getCart(ToolContext ctx) {
        return cartClient.getCart(userId(ctx));
    }

    private String userId(ToolContext ctx) {
        return ctx.getContext().get("userId").toString();
    }
}
