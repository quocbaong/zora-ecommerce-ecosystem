package com.ecommerce.product.controller;

import com.ecommerce.product.entity.ProductStatus;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.service.ProductService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
@AutoConfigureMockMvc(addFilters = false) // bỏ Spring Security filter để test logic controller
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductService productService;

    @MockitoBean
    private ProductRepository productRepository;

    @Test
    void adminStatsAggregatesCounts() throws Exception {
        when(productRepository.count()).thenReturn(10L);
        when(productRepository.countByStatus(ProductStatus.ACTIVE)).thenReturn(7L);
        when(productRepository.countByStatus(ProductStatus.DISABLED)).thenReturn(3L);
        when(productRepository.countByCreatedAtAfter(any())).thenReturn(2L);

        mockMvc.perform(get("/products/admin/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalProducts").value(10))
                .andExpect(jsonPath("$.activeProducts").value(7))
                .andExpect(jsonPath("$.disabledProducts").value(3));
    }
}
