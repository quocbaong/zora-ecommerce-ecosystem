package com.ecommerce.auth_service.repository;

import com.ecommerce.auth_service.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
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
class UserRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private UserRepository userRepository;

    @Test
    void findByEmailAndExistsByEmail() {
        userRepository.save(User.builder()
                .email("a@b.com")
                .password("hashed")
                .role("USER")
                .build());

        assertThat(userRepository.findByEmail("a@b.com")).isPresent();
        assertThat(userRepository.existsByEmail("a@b.com")).isTrue();
        assertThat(userRepository.findByEmail("missing@b.com")).isEmpty();
        assertThat(userRepository.existsByEmail("missing@b.com")).isFalse();
    }
}
