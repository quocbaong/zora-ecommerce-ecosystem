package com.ecommerce.ai_service.repository;

import com.ecommerce.ai_service.entity.AIMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AIMessageRepository extends JpaRepository<AIMessage, String> {
    List<AIMessage> findByConversationIdOrderByCreatedAtAsc(String conversationId, Pageable pageable);
    List<AIMessage> findByConversationIdOrderByCreatedAtAsc(String conversationId);
    void deleteByConversationId(String conversationId);
}
