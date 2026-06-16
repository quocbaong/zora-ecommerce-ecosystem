package com.ecommerce.order_service.component;

import com.ecommerce.order_service.dto.request.OrderItemRequest;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OrderCalculatorTest {

    private final OrderCalculator calculator = new OrderCalculator();

    private OrderItemRequest item(double price, int quantity) {
        return OrderItemRequest.builder()
                .productId("p")
                .price(price)
                .quantity(quantity)
                .build();
    }

    @Test
    void sumsItemsPriceTimesQuantity() {
        double total = calculator.calculateTotal(List.of(item(100.0, 2), item(50.0, 3)), 0.0, 0.0);
        assertEquals(350.0, total);
    }

    @Test
    void addsShippingAndSubtractsDiscount() {
        double total = calculator.calculateTotal(List.of(item(100.0, 1)), 30.0, 20.0);
        assertEquals(110.0, total);
    }

    @Test
    void neverReturnsNegativeWhenDiscountExceedsTotal() {
        double total = calculator.calculateTotal(List.of(item(100.0, 1)), 0.0, 500.0);
        assertEquals(0.0, total);
    }

    @Test
    void nullItemsReturnZero() {
        assertEquals(0.0, calculator.calculateTotal(null, 50.0, 0.0));
    }

    @Test
    void nullShippingAndDiscountTreatedAsZero() {
        double total = calculator.calculateTotal(List.of(item(100.0, 2)), null, null);
        assertEquals(200.0, total);
    }
}
