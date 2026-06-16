package com.ecommerce.ai_service.controller;

import com.ecommerce.ai_service.config.AIProperties;
import com.ecommerce.ai_service.dto.request.ChatRequest;
import com.ecommerce.ai_service.dto.response.ChatResponse;
import com.ecommerce.ai_service.dto.response.HealthResponse;
import com.ecommerce.ai_service.entity.AIConversation;
import com.ecommerce.ai_service.service.AIChatService;
import com.ecommerce.ai_service.service.HistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@Slf4j
public class AIChatController {

    private final AIChatService aiChatService;
    private final HistoryService historyService;
    private final AIProperties aiProperties;

    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(
            @Valid @RequestBody ChatRequest request,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "X-Role", defaultValue = "USER") String role) {
        log.info("[AI_CHAT] POST /chat userId={} role={}", userId, role);
        return ResponseEntity.ok(aiChatService.chat(request, userId, role));
    }

    @GetMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamChat(
            @RequestParam String message,
            @RequestParam(required = false) String conversationId,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "X-Role", defaultValue = "USER") String role) {
        log.info("[AI_CHAT] GET /chat/stream userId={} role={}", userId, role);
        ChatRequest req = new ChatRequest();
        req.setMessage(message);
        req.setConversationId(conversationId);
        return aiChatService.streamChat(req, userId, role);
    }

    @GetMapping("/history")
    public ResponseEntity<List<AIConversation>> getHistory(
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(historyService.getUserConversations(userId));
    }

    @GetMapping("/history/{conversationId}")
    public ResponseEntity<List<com.ecommerce.ai_service.entity.AIMessage>> getConversationMessages(
            @PathVariable String conversationId,
            @RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(historyService.getConversationMessages(conversationId, userId));
    }

    @DeleteMapping("/history")
    public ResponseEntity<Void> deleteHistory(
            @RequestHeader("X-User-Id") String userId) {
        log.info("[AI_CHAT] DELETE /history userId={}", userId);
        historyService.deleteUserHistory(userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/health")
    public ResponseEntity<HealthResponse> health() {
        return ResponseEntity.ok(HealthResponse.builder()
                .serviceUp(true)
                .aiEnabled(aiProperties.isEnabled())
                .historyEnabled(aiProperties.isHistoryEnabled())
                .toolCallEnabled(aiProperties.isToolCallEnabled())
                .model("gemini via spring-ai")
                .build());
    }
}
