package com.ecommerce.user_service.repository;

import com.ecommerce.user_service.entity.Address;
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
class AddressRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private AddressRepository addressRepository;

    @Autowired
    private TestEntityManager em;

    private Address addr(String userId, boolean isDefault) {
        return Address.builder()
                .userId(userId)
                .receiverName("Receiver")
                .phone("0900000000")
                .province("Hà Nội")
                .district("Ba Đình")
                .ward("Ward 1")
                .street("123 Street")
                .isDefault(isDefault)
                .build();
    }

    @Test
    void findByUserIdReturnsOnlyThatUsersAddresses() {
        em.persist(addr("u1", true));
        em.persist(addr("u1", false));
        em.persistAndFlush(addr("u2", false));

        assertThat(addressRepository.findByUserId("u1")).hasSize(2);
    }

    @Test
    void findByIdAndUserIdScopesToOwner() {
        Address saved = addr("u1", false);
        em.persistAndFlush(saved);

        assertThat(addressRepository.findByIdAndUserId(saved.getId(), "u1")).isPresent();
        assertThat(addressRepository.findByIdAndUserId(saved.getId(), "intruder")).isEmpty();
    }

    @Test
    void unsetDefaultAddressesClearsDefaultFlag() {
        Address saved = addr("u1", true);
        em.persistAndFlush(saved);

        addressRepository.unsetDefaultAddresses("u1");
        em.clear();

        assertThat(addressRepository.findById(saved.getId()).orElseThrow().getIsDefault()).isFalse();
    }
}
