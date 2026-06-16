package com.ecommerce.ai_service.service;

import com.ecommerce.ai_service.config.AIProperties;
import com.ecommerce.ai_service.dto.request.ChatRequest;
import com.ecommerce.ai_service.dto.response.ChatResponse;
import com.ecommerce.ai_service.exception.DailyLimitExceededException;
import com.ecommerce.ai_service.service.tool.SellerChatTools;
import com.ecommerce.ai_service.service.tool.UserChatTools;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AIChatService {

    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    private final HistoryService historyService;
    private final PromptBuilderService promptBuilderService;
    private final UserChatTools userChatTools;
    private final SellerChatTools sellerChatTools;
    private final AIProperties aiProperties;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String FALLBACK_REPLY = "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau.";
    private static final String RATE_LIMIT_REPLY = "AI đang bận xử lý nhiều yêu cầu, vui lòng thử lại sau 1 phút.";

    public AIChatService(ChatClient.Builder chatClientBuilder,
                         VectorStore vectorStore,
                         HistoryService historyService,
                         PromptBuilderService promptBuilderService,
                         UserChatTools userChatTools,
                         SellerChatTools sellerChatTools,
                         AIProperties aiProperties,
                         StringRedisTemplate redisTemplate,
                         ObjectMapper objectMapper) {
        this.chatClient = chatClientBuilder.build();
        this.vectorStore = vectorStore;
        this.historyService = historyService;
        this.promptBuilderService = promptBuilderService;
        this.userChatTools = userChatTools;
        this.sellerChatTools = sellerChatTools;
        this.aiProperties = aiProperties;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public ChatResponse chat(ChatRequest request, String userId, String role) {
        if (!aiProperties.isEnabled()) {
            return ChatResponse.builder().reply("AI chat hiện không khả dụng.").build();
        }

        ChatResponse cached = getCachedResponse(request.getRequestId());
        if (cached != null) {
            log.info("[AI_CHAT] Returning cached response for requestId={}", request.getRequestId());
            return cached;
        }

        checkDailyLimit(userId);

        String convId = resolveConversationId(request.getConversationId(), userId);
        List<Message> history = loadHistory(convId);
        String systemPrompt = buildSystemPrompt(role, request.getMessage());
        Object tools = resolveTools(role);

        try {
            var prompt = chatClient.prompt()
                    .system(systemPrompt)
                    .messages(history)
                    .user(request.getMessage());
            if (aiProperties.isToolCallEnabled()) {
                prompt = prompt.tools(tools).toolContext(Map.of("userId", userId, "role", role));
            }
            String reply = prompt.call().content();

            if (reply == null) reply = FALLBACK_REPLY;

            historyService.saveAsync(convId, userId, role, request.getMessage(), reply, null);

            ChatResponse response = ChatResponse.builder()
                    .conversationId(convId)
                    .reply(reply)
                    .build();

            cacheResponse(request.getRequestId(), response);
            return response;

        } catch (Exception e) {
            log.error("[AI_CHAT] Chat failed userId={}: {}", userId, e.getMessage(), e);
            String reply = is429(e) ? RATE_LIMIT_REPLY : FALLBACK_REPLY;
            return ChatResponse.builder().conversationId(convId).reply(reply).build();
        }
    }

    public Flux<String> streamChat(ChatRequest request, String userId, String role) {
        if (!aiProperties.isEnabled()) return Flux.just("AI chat hiện không khả dụng.");

        checkDailyLimit(userId);

        String convId = resolveConversationId(request.getConversationId(), userId);
        List<Message> history = loadHistory(convId);
        String systemPrompt = buildSystemPrompt(role, request.getMessage());
        Object tools = resolveTools(role);

        StringBuilder fullReply = new StringBuilder();
        var streamPrompt = chatClient.prompt()
                .system(systemPrompt)
                .messages(history)
                .user(request.getMessage());
        if (aiProperties.isToolCallEnabled()) {
            streamPrompt = streamPrompt.tools(tools).toolContext(Map.of("userId", userId, "role", role));
        }
        return streamPrompt.stream()
                .content()
                .doOnNext(fullReply::append)
                .doOnComplete(() ->
                        historyService.saveAsync(convId, userId, role, request.getMessage(), fullReply.toString(), null))
                .onErrorReturn(t -> is429(t), RATE_LIMIT_REPLY)
                .onErrorReturn(FALLBACK_REPLY);
    }

    private boolean is429(Throwable t) {
        Throwable cur = t;
        while (cur != null) {
            String msg = cur.getMessage();
            if (msg != null && (msg.contains("429") || msg.contains("RESOURCE_EXHAUSTED") || msg.contains("Quota exceeded"))) return true;
            cur = cur.getCause();
        }
        return false;
    }

    private void checkDailyLimit(String userId) {
        int limit = aiProperties.getMaxRequestsPerDayPerUser();
        String key = "ai:daily:" + userId + ":" + LocalDate.now();
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) redisTemplate.expire(key, Duration.ofDays(2));
        if (count != null && count > limit) {
            log.warn("[AI_CHAT] Daily limit exceeded userId={} count={}", userId, count);
            throw new DailyLimitExceededException(limit);
        }
    }

    private ChatResponse getCachedResponse(String requestId) {
        if (requestId == null || requestId.isBlank()) return null;
        try {
            String json = redisTemplate.opsForValue().get("ai:idem:" + requestId);
            return json != null ? objectMapper.readValue(json, ChatResponse.class) : null;
        } catch (Exception e) { return null; }
    }

    private void cacheResponse(String requestId, ChatResponse response) {
        if (requestId == null || requestId.isBlank()) return;
        try {
            redisTemplate.opsForValue().set("ai:idem:" + requestId,
                    objectMapper.writeValueAsString(response), Duration.ofSeconds(60));
        } catch (Exception e) {
            log.warn("[AI_CHAT] Failed to cache response: {}", e.getMessage());
        }
    }

    private String resolveConversationId(String requestedId, String userId) {
        return (requestedId != null && !requestedId.isBlank())
                ? requestedId : historyService.newConversationId(userId);
    }

    private List<Message> loadHistory(String convId) {
        return aiProperties.isHistoryEnabled()
                ? historyService.loadHistory(convId, aiProperties.getMaxHistoryMessages())
                : List.of();
    }

    private Object resolveTools(String role) {
        return "SELLER".equalsIgnoreCase(role) ? sellerChatTools : userChatTools;
    }

    private String buildSystemPrompt(String role, String userMessage) {
        String base = promptBuilderService.buildSystemPrompt(role);
        String ragContext = fetchRagContext(userMessage);
        if (ragContext.isBlank()) return base;
        return base + "\n\n--- Thông tin tham khảo ZORA ---\n" + ragContext + "\n--- Hết thông tin tham khảo ---";
    }

    private String fetchRagContext(String query) {
        try {
            List<Document> docs = vectorStore.similaritySearch(
                    SearchRequest.builder().query(query).topK(3).similarityThreshold(0.5).build());
            return docs.stream().map(Document::getText).collect(Collectors.joining("\n\n"));
        } catch (Exception e) {
            log.warn("[RAG] Vector search failed: {}", e.getMessage());
            return "";
        }
    }
}
