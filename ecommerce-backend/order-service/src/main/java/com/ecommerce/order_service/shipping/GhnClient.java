package com.ecommerce.order_service.shipping;

import com.ecommerce.order_service.exception.CustomException;
import com.ecommerce.order_service.shipping.dto.GhnDistrictDto;
import com.ecommerce.order_service.shipping.dto.GhnProvinceDto;
import com.ecommerce.order_service.shipping.dto.GhnWardDto;
import com.ecommerce.order_service.shipping.dto.ShippingFeeRequest;
import com.ecommerce.order_service.shipping.dto.ShippingFeeResponse;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
@Slf4j
public class GhnClient {

    private final RestTemplate restTemplate;

    @Value("${ghn.base-url}")
    private String baseUrl;

    @Value("${ghn.token}")
    private String token;

    @Value("${ghn.shop-id}")
    private String shopId;

    private static final Duration MASTER_DATA_TTL = Duration.ofHours(24);

    private record CacheEntry<T>(T value, Instant expiresAt) {
        boolean expired() { return Instant.now().isAfter(expiresAt); }
    }

    private volatile CacheEntry<List<GhnProvinceDto>> provincesCache;
    private final Map<Integer, CacheEntry<List<GhnDistrictDto>>> districtsCache = new ConcurrentHashMap<>();
    private final Map<Integer, CacheEntry<List<GhnWardDto>>> wardsCache = new ConcurrentHashMap<>();

    public List<GhnProvinceDto> getProvinces() {
        CacheEntry<List<GhnProvinceDto>> cached = provincesCache;
        if (cached != null && !cached.expired()) return cached.value();

        GhnEnvelope<List<GhnProvinceDto>> resp = exchange(
                baseUrl + "/shiip/public-api/master-data/province",
                HttpMethod.GET, null,
                new com.fasterxml.jackson.core.type.TypeReference<>() {}
        );
        List<GhnProvinceDto> data = resp.getData() == null ? List.of() : resp.getData();
        provincesCache = new CacheEntry<>(data, Instant.now().plus(MASTER_DATA_TTL));
        return data;
    }

    public List<GhnDistrictDto> getDistricts(Integer provinceId) {
        if (provinceId == null) throw new CustomException("provinceId is required", HttpStatus.BAD_REQUEST);
        CacheEntry<List<GhnDistrictDto>> cached = districtsCache.get(provinceId);
        if (cached != null && !cached.expired()) return cached.value();

        Map<String, Object> body = Map.of("province_id", provinceId);
        GhnEnvelope<List<GhnDistrictDto>> resp = exchange(
                baseUrl + "/shiip/public-api/master-data/district",
                HttpMethod.POST, body,
                new com.fasterxml.jackson.core.type.TypeReference<>() {}
        );
        List<GhnDistrictDto> data = resp.getData() == null ? List.of() : resp.getData();
        districtsCache.put(provinceId, new CacheEntry<>(data, Instant.now().plus(MASTER_DATA_TTL)));
        return data;
    }

    public List<GhnWardDto> getWards(Integer districtId) {
        if (districtId == null) throw new CustomException("districtId is required", HttpStatus.BAD_REQUEST);
        CacheEntry<List<GhnWardDto>> cached = wardsCache.get(districtId);
        if (cached != null && !cached.expired()) return cached.value();

        String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/shiip/public-api/master-data/ward")
                .queryParam("district_id", districtId)
                .toUriString();
        GhnEnvelope<List<GhnWardDto>> resp = exchange(
                url, HttpMethod.GET, null,
                new com.fasterxml.jackson.core.type.TypeReference<>() {}
        );
        List<GhnWardDto> data = resp.getData() == null ? List.of() : resp.getData();
        wardsCache.put(districtId, new CacheEntry<>(data, Instant.now().plus(MASTER_DATA_TTL)));
        return data;
    }

    public ShippingFeeResponse calculateFee(ShippingFeeRequest req) {
        Map<String, Object> body = new HashMap<>();
        body.put("service_type_id", req.getServiceTypeId() != null ? req.getServiceTypeId() : 2);
        body.put("from_district_id", req.getFromDistrictId());
        body.put("from_ward_code", req.getFromWardCode());
        body.put("to_district_id", req.getToDistrictId());
        body.put("to_ward_code", req.getToWardCode());
        body.put("weight", req.getWeight());
        body.put("length", req.getLength() != null ? req.getLength() : 20);
        body.put("width", req.getWidth() != null ? req.getWidth() : 15);
        body.put("height", req.getHeight() != null ? req.getHeight() : 10);
        body.put("insurance_value", req.getInsuranceValue() != null ? req.getInsuranceValue() : 0);

        if (req.getItems() != null && !req.getItems().isEmpty()) {
            body.put("items", req.getItems());
        }

        GhnEnvelope<ShippingFeeResponse> resp = exchange(
                baseUrl + "/shiip/public-api/v2/shipping-order/fee",
                HttpMethod.POST, body,
                new com.fasterxml.jackson.core.type.TypeReference<>() {}
        );
        if (resp.getData() == null) {
            throw new CustomException("GHN trả về dữ liệu rỗng", HttpStatus.BAD_GATEWAY);
        }
        return resp.getData();
    }

    private <T> GhnEnvelope<T> exchange(
            String url,
            HttpMethod method,
            Object body,
            com.fasterxml.jackson.core.type.TypeReference<GhnEnvelope<T>> typeRef
    ) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Token", token);
        headers.set("ShopId", shopId);

        try {
            ResponseEntity<String> raw = restTemplate.exchange(
                    url, method, new HttpEntity<>(body, headers), String.class
            );
            return new com.fasterxml.jackson.databind.ObjectMapper()
                    .readValue(raw.getBody(), typeRef);
        } catch (HttpStatusCodeException e) {
            log.error("GHN API error [{}] {}: {}", method, url, e.getResponseBodyAsString());
            throw new CustomException(
                    "GHN API lỗi: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(),
                    HttpStatus.BAD_GATEWAY
            );
        } catch (Exception e) {
            log.error("GHN request failed [{}] {}: {}", method, url, e.getMessage(), e);
            throw new CustomException("Không gọi được GHN: " + e.getMessage(), HttpStatus.BAD_GATEWAY);
        }
    }

    @Data
    public static class GhnEnvelope<T> {
        private Integer code;
        private String message;

        @JsonProperty("data")
        private T data;
    }
}
