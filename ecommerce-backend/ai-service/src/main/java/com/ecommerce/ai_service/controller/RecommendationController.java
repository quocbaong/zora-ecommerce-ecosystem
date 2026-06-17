package com.ecommerce.ai_service.controller;

import com.ecommerce.ai_service.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/ai/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping("/{productId}")
    public ResponseEntity<List<String>> getRecommendations(
            @PathVariable String productId,
            @RequestParam(defaultValue = "5") int limit) {
        
        List<String> recommendedIds = recommendationService.getRecommendationsForProduct(productId, limit);
        return ResponseEntity.ok(recommendedIds);
    }

    @PostMapping("/sync")
    public ResponseEntity<String> syncAllProducts() {
        recommendationService.syncAllProductsToVectorStore();
        return ResponseEntity.ok("Quá trình đồng bộ sản phẩm vào Vector Store đang được thực hiện!");
    }
}
