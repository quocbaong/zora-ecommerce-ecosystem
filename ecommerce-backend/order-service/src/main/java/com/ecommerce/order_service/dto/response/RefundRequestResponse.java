package com.ecommerce.order_service.dto.response;
import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.time.LocalDateTime;

@Data
@Builder
public class RefundRequestResponse {
    private String id;
    private String type;
    private String status;
    private String reason;
    private Double requestedAmount;
    private Double approvedAmount;
    private List<String> evidenceUrls;
    private List<String> sellerEvidenceUrls;
    private String sellerDisputeReason;
    private List<RefundItemResponse> items;
    private ReturnShipmentResponse returnShipment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
