package com.ecommerce.product.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdCampaignCreateRequest {

    @NotBlank
    @Size(max = 200)
    private String title;

    @Size(max = 500)
    private String description;

    @NotBlank
    private String bannerUrl;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;
}
