package com.ecommerce.order_service.controller;

import com.ecommerce.order_service.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/orders/admin/revenue")
@RequiredArgsConstructor
public class AdminRevenueController {

    private final OrderRepository orderRepository;

    // Doanh thu theo thời gian (ngày/tháng) — chỉ đơn DELIVERED
    @GetMapping
    public List<Map<String, Object>> getRevenue(
            @RequestParam(defaultValue = "day") String range) {

        if ("month".equals(range)) {
            return orderRepository.adminRevenueByMonth().stream()
                    .map(row -> Map.<String, Object>of(
                            "label", row[0].toString(),
                            "revenue", ((Number) row[2]).doubleValue(),
                            "orderCount", ((Number) row[3]).longValue()
                    ))
                    .collect(Collectors.toList());
        }

        // Mặc định: 30 ngày gần nhất
        LocalDateTime since = LocalDateTime.now().minusDays(30);
        return orderRepository.adminRevenueByDay(since).stream()
                .map(row -> Map.<String, Object>of(
                        "label", row[0].toString(),
                        "revenue", ((Number) row[2]).doubleValue(),
                        "orderCount", ((Number) row[3]).longValue()
                ))
                .collect(Collectors.toList());
    }

    // Top seller theo doanh thu (đơn DELIVERED)
    @GetMapping("/sellers")
    public List<Map<String, Object>> getTopSellers(
            @RequestParam(defaultValue = "20") int limit) {
        return orderRepository.adminRevenueBySellerTop(limit).stream()
                .map(row -> Map.<String, Object>of(
                        "sellerId", row[0].toString(),
                        "revenue", ((Number) row[1]).doubleValue(),
                        "orderCount", ((Number) row[2]).longValue(),
                        "itemsSold", ((Number) row[3]).longValue()
                ))
                .collect(Collectors.toList());
    }

    // Xuất CSV — đơn DELIVERED trong N ngày gần nhất (mặc định 90 ngày)
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(defaultValue = "90") int days) {

        LocalDateTime since = LocalDateTime.now().minusDays(days);
        List<Object[]> rows = orderRepository.adminExportRevenue(since);

        StringBuilder csv = new StringBuilder();
        csv.append("order_id,user_id,total_price,created_at,delivered_at,seller_id,product_name,quantity,unit_price,subtotal\n");
        for (Object[] row : rows) {
            csv.append(csvEscape(row[0])).append(',')
               .append(csvEscape(row[1])).append(',')
               .append(csvEscape(row[2])).append(',')
               .append(csvEscape(row[3])).append(',')
               .append(csvEscape(row[4])).append(',')
               .append(csvEscape(row[5])).append(',')
               .append(csvEscape(row[6])).append(',')
               .append(csvEscape(row[7])).append(',')
               .append(csvEscape(row[8])).append(',')
               .append(csvEscape(row[9])).append('\n');
        }

        byte[] bytes = csv.toString().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"revenue_export.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(bytes);
    }

    private String csvEscape(Object val) {
        if (val == null) return "";
        String s = val.toString().replace("\"", "\"\"");
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            return "\"" + s + "\"";
        }
        return s;
    }
}
