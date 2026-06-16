package com.ecommerce.order_service.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;

@Data
public class RefundCreateRequest {
    @NotBlank
    private String type; // REFUND_ONLY or RETURN_AND_REFUND

    @NotBlank
    private String reason;

    @NotEmpty
    private List<RefundItemRequest> items;

    @NotEmpty
    private List<String> evidenceUrls;
}
