package com.ecommerce.order_service.repository;

import com.ecommerce.order_service.entity.Order;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class OrderRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private OrderRepository orderRepository;

    private Order order(String userId, String status) {
        return Order.builder()
                .userId(userId)
                .status(status)
                .paymentMethod("COD")
                .paymentStatus("PENDING")
                .totalPrice(100.0)
                .build();
    }

    @Test
    void savesAndFindsById() {
        Order saved = orderRepository.save(order("u1", "PENDING"));

        Optional<Order> found = orderRepository.findById(saved.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getUserId()).isEqualTo("u1");
        assertThat(found.get().getCreatedAt()).isNotNull(); // @PrePersist
    }

    @Test
    void findByUserIdReturnsOnlyThatUsersOrders() {
        orderRepository.save(order("u1", "PENDING"));
        orderRepository.save(order("u1", "CONFIRMED"));
        orderRepository.save(order("u2", "PENDING"));

        Page<Order> page = orderRepository.findByUserId("u1", PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(2);
    }

    @Test
    void findByIdWithLockReturnsOrder() {
        Order saved = orderRepository.save(order("u3", "PENDING"));

        assertThat(orderRepository.findByIdWithLock(saved.getId())).isPresent();
    }
}
