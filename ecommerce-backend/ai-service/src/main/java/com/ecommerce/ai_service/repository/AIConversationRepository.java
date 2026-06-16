package com.ecommerce.ai_service.repository;

import com.ecommerce.ai_service.entity.AIConversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AIConversationRepository extends JpaRepository<AIConversation, String> {
    List<AIConversation> findByUserIdOrderByUpdatedAtDesc(String userId);
    void deleteByUserId(String userId);
}
