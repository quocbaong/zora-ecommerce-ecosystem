package com.ecommerce.ai_service.repository;

import com.ecommerce.ai_service.entity.AIConversation;
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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class AIConversationRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private AIConversationRepository conversationRepository;

    @Autowired
    private TestEntityManager em;

    private AIConversation conversation(String userId) {
        return AIConversation.builder()
                .id("AI#" + userId + "#" + UUID.randomUUID())
                .userId(userId)
                .roleAtTime("USER")
                .title("Hello")
                .build();
    }

    @Test
    void findByUserIdReturnsOnlyThatUsersConversations() {
        em.persist(conversation("u1"));
        em.persist(conversation("u1"));
        em.persistAndFlush(conversation("u2"));

        assertThat(conversationRepository.findByUserIdOrderByUpdatedAtDesc("u1")).hasSize(2);
        assertThat(conversationRepository.findByUserIdOrderByUpdatedAtDesc("u2")).hasSize(1);
    }
}
