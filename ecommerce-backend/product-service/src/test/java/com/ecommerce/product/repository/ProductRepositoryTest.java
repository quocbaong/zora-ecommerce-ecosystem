package com.ecommerce.product.repository;

import com.ecommerce.product.entity.Category;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.entity.ProductStatus;
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

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class ProductRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private TestEntityManager em;

    private String persistProduct(int stock) {
        Category category = Category.builder().name("Electronics").build();
        em.persist(category);
        Product product = Product.builder()
                .name("Phone")
                .sellerId("s1")
                .price(new BigDecimal("100.00"))
                .stock(stock)
                .category(category)
                .status(ProductStatus.ACTIVE)
                .build();
        em.persistAndFlush(product);
        return product.getId();
    }

    @Test
    void decrementStockAtomicReducesStockWhenEnough() {
        String id = persistProduct(10);

        int updated = productRepository.decrementStockAtomic(id, 3);
        em.clear();

        assertThat(updated).isEqualTo(1);
        Product reloaded = productRepository.findById(id).orElseThrow();
        assertThat(reloaded.getStock()).isEqualTo(7);
        assertThat(reloaded.getSoldCount()).isEqualTo(3);
    }

    @Test
    void decrementStockAtomicBlocksOverselling() {
        String id = persistProduct(2);

        int updated = productRepository.decrementStockAtomic(id, 5);
        em.clear();

        assertThat(updated).isZero();
        assertThat(productRepository.findById(id).orElseThrow().getStock()).isEqualTo(2);
    }

    @Test
    void findBySellerIdReturnsSellerProducts() {
        persistProduct(10);

        assertThat(productRepository.findBySellerId("s1")).hasSize(1);
    }
}
