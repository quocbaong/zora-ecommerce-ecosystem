package com.ecommerce.ai_service.service;

import com.ecommerce.ai_service.entity.AIConversation;
import com.ecommerce.ai_service.entity.AIMessage;
import com.ecommerce.ai_service.repository.AIConversationRepository;
import com.ecommerce.ai_service.repository.AIMessageRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HistoryService {

    private final AIConversationRepository conversationRepository;
    private final AIMessageRepository messageRepository;
    private final ObjectMapper objectMapper;

    public List<Message> loadHistory(String conversationId, int limit) {
        if (conversationId == null || conversationId.isBlank()) return List.of();
        try {
            return messageRepository
                    .findByConversationIdOrderByCreatedAtAsc(conversationId, PageRequest.of(0, limit))
                    .stream()
                    .map(msg -> {
                        if ("USER".equals(msg.getSenderType())) {
                            return (Message) new UserMessage(msg.getContent());
                        } else {
                            return (Message) new AssistantMessage(msg.getContent());
                        }
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("[AI_CHAT] loadHistory failed for {}: {}", conversationId, e.getMessage());
            return List.of();
        }
    }

    @Transactional
    public List<AIConversation> getUserConversations(String userId) {
        return conversationRepository.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    @Async
    @Transactional
    public void saveAsync(String conversationId, String userId, String role,
                          String userMessage, String assistantReply, Map<String, Object> richData) {
        try {
            if (!conversationRepository.existsById(conversationId)) {
                String title = userMessage.length() > 60
                        ? userMessage.substring(0, 60) + "…"
                        : userMessage;
                conversationRepository.save(AIConversation.builder()
                        .id(conversationId).userId(userId).roleAtTime(role).title(title).build());
            }
            messageRepository.save(AIMessage.builder()
                    .conversationId(conversationId).senderType("USER")
                    .roleAtTime(role).content(userMessage).build());

            String richDataJson = null;
            if (richData != null && !richData.isEmpty()) {
                try { richDataJson = objectMapper.writeValueAsString(richData); } catch (Exception ignored) {}
            }
            messageRepository.save(AIMessage.builder()
                    .conversationId(conversationId).senderType("ASSISTANT")
                    .roleAtTime(role).content(assistantReply).richDataJson(richDataJson).build());
        } catch (Exception e) {
            log.warn("[AI_CHAT] saveAsync failed for {}: {}", conversationId, e.getMessage());
        }
    }

    @Transactional
    public void deleteUserHistory(String userId) {
        List<AIConversation> convs = conversationRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        for (AIConversation conv : convs) {
            messageRepository.deleteByConversationId(conv.getId());
        }
        conversationRepository.deleteByUserId(userId);
    }

    public List<AIMessage> getConversationMessages(String conversationId, String userId) {
        return conversationRepository.findById(conversationId)
                .filter(c -> c.getUserId().equals(userId))
                .map(c -> messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId))
                .orElse(List.of());
    }

    public String newConversationId(String userId) {
        return "AI#" + userId + "#" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
