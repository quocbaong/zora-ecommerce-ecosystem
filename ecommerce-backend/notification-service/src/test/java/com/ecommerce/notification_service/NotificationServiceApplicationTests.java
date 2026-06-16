package com.ecommerce.notification_service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Disabled;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@Disabled("Needs Postgres/Redis/Kafka infra; run via Testcontainers later. Unit tests cover logic.")
class NotificationServiceApplicationTests {

	@Test
	void contextLoads() {
	}

}
