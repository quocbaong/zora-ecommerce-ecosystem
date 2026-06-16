package com.ecommerce.cart_service.repository;

import com.ecommerce.cart_service.entity.Cart;
import com.ecommerce.cart_service.entity.CartItem;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class CartRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private TestEntityManager em;

    @Test
    void findByUserIdReturnsUsersCart() {
        em.persistAndFlush(Cart.builder().userId("u1").build());

        assertThat(cartRepository.findByUserId("u1")).isPresent();
        assertThat(cartRepository.findByUserId("ghost")).isEmpty();
    }

    @Test
    void findByCartIdAndProductIdAndVariantIdMatchesItem() {
        Cart cart = Cart.builder().userId("u2").build();
        em.persist(cart);
        CartItem item = CartItem.builder()
                .cart(cart)
                .productId("p1")
                .variantId("v1")
                .name("Phone")
                .quantity(2)
                .price(100.0)
                .build();
        em.persistAndFlush(item);

        assertThat(cartItemRepository.findByCartIdAndProductIdAndVariantId(cart.getId(), "p1", "v1")).isPresent();
        assertThat(cartItemRepository.findByCartIdAndProductIdAndVariantId(cart.getId(), "p1", "other")).isEmpty();
    }
}
