package com.ecommerce.notification_service.repository;

import com.ecommerce.notification_service.entity.Notification;
import com.ecommerce.notification_service.entity.NotificationType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class NotificationRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private TestEntityManager em;

    private Notification notif(String userId, boolean isRead) {
        return Notification.builder()
                .userId(userId)
                .type(NotificationType.values()[0])
                .title("Title")
                .message("Message")
                .isRead(isRead)
                .build();
    }

    @Test
    void countByUserIdAndIsReadFalseCountsOnlyUnread() {
        em.persist(notif("u1", false));
        em.persist(notif("u1", false));
        em.persist(notif("u1", true));
        em.persistAndFlush(notif("u2", false));

        assertThat(notificationRepository.countByUserIdAndIsReadFalse("u1")).isEqualTo(2);
        assertThat(notificationRepository.findByUserIdAndIsReadFalse("u1")).hasSize(2);
    }

    @Test
    void findByUserIdOrderByCreatedAtDescReturnsAllUsersNotifications() {
        em.persist(notif("u1", false));
        em.persist(notif("u1", true));
        em.persistAndFlush(notif("u2", false));

        assertThat(notificationRepository.findByUserIdOrderByCreatedAtDesc("u1", PageRequest.of(0, 10))
                .getTotalElements()).isEqualTo(2);
    }
}
