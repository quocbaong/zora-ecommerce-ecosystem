package com.ecommerce.ai_service.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RagIngestionService {

    private final VectorStore vectorStore;
    private final StringRedisTemplate redisTemplate;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private static final String HASH_KEY = "rag:knowledge:hash";

    @PostConstruct
    public void ingest() {
        try {
            ClassPathResource resource = new ClassPathResource("rag/zora-knowledge.md");
            String content;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                content = reader.lines().collect(Collectors.joining("\n"));
            }

            // Calculate MD5 hash of the file content
            String currentHash = org.springframework.util.DigestUtils.md5DigestAsHex(content.getBytes(StandardCharsets.UTF_8));
            String storedHash = redisTemplate.opsForValue().get(HASH_KEY);

            if (currentHash.equals(storedHash)) {
                log.info("[RAG] Knowledge base is up-to-date (hash: {}), skipping ingestion.", currentHash);
                return;
            }

            log.info("[RAG] Knowledge base changed. Old hash: {}, New hash: {}. Re-ingesting...", storedHash, currentHash);
            
            // Clear old data to prevent duplication
            try {
                jdbcTemplate.execute("TRUNCATE TABLE vector_store");
                log.info("[RAG] Cleared old vector_store data.");
            } catch (Exception e) {
                log.warn("[RAG] Could not truncate vector_store (maybe it's empty or doesn't exist yet): {}", e.getMessage());
            }

            List<Document> docs = splitByHeading(content);
            vectorStore.add(docs);
            
            // Save new hash
            redisTemplate.opsForValue().set(HASH_KEY, currentHash);
            log.info("[RAG] Ingested {} chunks into vector store. Updated hash.", docs.size());

        } catch (Exception e) {
            log.error("[RAG] Ingestion failed: {}", e.getMessage(), e);
        }
    }

    // Removed loadDocuments() as its logic is now inside ingest()

    private List<Document> splitByHeading(String content) {
        List<Document> docs = new ArrayList<>();
        String[] sections = content.split("(?m)(?=^## )");
        for (String section : sections) {
            String trimmed = section.trim();
            if (trimmed.isEmpty()) continue;
            String[] lines = trimmed.split("\n", 2);
            String heading = lines[0].replaceFirst("^#{1,3}\\s*", "").trim();
            String body = lines.length > 1 ? lines[1].trim() : "";
            if (!body.isEmpty()) {
                docs.add(new Document(heading + "\n" + body,
                        Map.of("source", "zora-knowledge", "heading", heading)));
            }
        }
        return docs;
    }
}
