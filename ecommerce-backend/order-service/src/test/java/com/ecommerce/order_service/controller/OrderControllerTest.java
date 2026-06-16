package com.ecommerce.order_service.controller;

import com.ecommerce.order_service.dto.response.OrderResponse;
import com.ecommerce.order_service.repository.OrderRepository;
import com.ecommerce.order_service.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrderService orderService;

    @MockitoBean
    private OrderRepository orderRepository;

    @MockitoBean
    private com.ecommerce.order_service.service.S3Service s3Service;

    @Test
    void getByIdReturnsOrder() throws Exception {
        OrderResponse resp = OrderResponse.builder()
                .id("o1").userId("u1").status("PENDING").totalPrice(150.0).build();
        when(orderService.getById(eq("o1"))).thenReturn(resp);

        mockMvc.perform(get("/orders/o1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("o1"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void adminStatsMapsAggregateRow() throws Exception {
        // [totalOrders, totalRevenue, revenueToday, revenueMonth, pending, confirmed, shipping, delivered, cancelled]
        Object[] row = {5L, 1000.0, 200.0, 800.0, 2L, 1L, 1L, 1L, 0L};
        when(orderRepository.adminStatsAggregate(any(), any())).thenReturn(List.<Object[]>of(row));

        mockMvc.perform(get("/orders/admin/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalOrders").value(5))
                .andExpect(jsonPath("$.pendingOrders").value(2));
    }
}
