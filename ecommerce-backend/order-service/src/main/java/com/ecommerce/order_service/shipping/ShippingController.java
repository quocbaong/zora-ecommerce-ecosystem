package com.ecommerce.order_service.shipping;

import com.ecommerce.order_service.shipping.dto.GhnDistrictDto;
import com.ecommerce.order_service.shipping.dto.GhnProvinceDto;
import com.ecommerce.order_service.shipping.dto.GhnWardDto;
import com.ecommerce.order_service.shipping.dto.ShippingFeeRequest;
import com.ecommerce.order_service.shipping.dto.ShippingFeeResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/shipping")
@RequiredArgsConstructor
public class ShippingController {

    private final GhnClient ghnClient;

    @GetMapping("/provinces")
    public ResponseEntity<List<GhnProvinceDto>> getProvinces() {
        return ResponseEntity.ok(ghnClient.getProvinces());
    }

    @GetMapping("/districts/{provinceId}")
    public ResponseEntity<List<GhnDistrictDto>> getDistricts(@PathVariable Integer provinceId) {
        return ResponseEntity.ok(ghnClient.getDistricts(provinceId));
    }

    @GetMapping("/wards/{districtId}")
    public ResponseEntity<List<GhnWardDto>> getWards(@PathVariable Integer districtId) {
        return ResponseEntity.ok(ghnClient.getWards(districtId));
    }

    @PostMapping("/fee")
    public ResponseEntity<ShippingFeeResponse> calculateFee(@Valid @RequestBody ShippingFeeRequest req) {
        return ResponseEntity.ok(ghnClient.calculateFee(req));
    }
}
