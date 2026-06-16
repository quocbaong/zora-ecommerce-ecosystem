package com.ecommerce.order_service.repository;

import com.ecommerce.order_service.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OutboxEventRepository extends JpaRepository<OutboxEvent, String> {
    List<OutboxEvent> findTop100ByStatusOrderByCreatedAtAsc(String status);
}
