package com.ecommerce.user_service.service;

import com.ecommerce.user_service.dto.OcrResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
@Slf4j
public class OcrService {

    private static final String FPT_OCR_URL = "https://api.fpt.ai/vision/idr/vnm";

    @Value("${fpt.ai.api-key:}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    public OcrResult extractCccdInfo(String imageUrl) {
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("[OCR] FPT_AI_API_KEY not configured");
            return OcrResult.builder().success(false).errorMessage("OCR service not configured").build();
        }

        Path tmpFile = null;
        try {
            // Download image from S3 URL to temp file
            tmpFile = downloadToTempFile(imageUrl);

            // Build multipart body manually for java.net.http.HttpClient
            String boundary = "----" + UUID.randomUUID().toString().replace("-", "");
            byte[] imageBytes = Files.readAllBytes(tmpFile);
            String filename = tmpFile.getFileName().toString();

            byte[] body = buildMultipartBody(boundary, imageBytes, filename);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(FPT_OCR_URL))
                    .header("api-key", apiKey)
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("[OCR] FPT AI response status={}", response.statusCode());

            return parseResponse(response.body());

        } catch (Exception e) {
            log.error("[OCR] Failed to extract CCCD info from {}: {}", imageUrl, e.getMessage(), e);
            return OcrResult.builder().success(false).errorMessage("OCR processing failed").build();
        } finally {
            if (tmpFile != null) {
                try { Files.deleteIfExists(tmpFile); } catch (Exception ignored) {}
            }
        }
    }

    private Path downloadToTempFile(String imageUrl) throws Exception {
        URL url = new URL(imageUrl);
        String ext = imageUrl.contains(".") ? imageUrl.substring(imageUrl.lastIndexOf('.')) : ".jpg";
        if (ext.length() > 5) ext = ".jpg";
        Path tmp = Files.createTempFile("kyc_", ext);
        try (InputStream in = url.openStream()) {
            Files.copy(in, tmp, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }
        return tmp;
    }

    private byte[] buildMultipartBody(String boundary, byte[] imageBytes, String filename) throws Exception {
        String contentType = filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
        String partHeader = "--" + boundary + "\r\n"
                + "Content-Disposition: form-data; name=\"image\"; filename=\"" + filename + "\"\r\n"
                + "Content-Type: " + contentType + "\r\n\r\n";
        String partFooter = "\r\n--" + boundary + "--\r\n";

        byte[] header = partHeader.getBytes();
        byte[] footer = partFooter.getBytes();

        byte[] combined = new byte[header.length + imageBytes.length + footer.length];
        System.arraycopy(header, 0, combined, 0, header.length);
        System.arraycopy(imageBytes, 0, combined, header.length, imageBytes.length);
        System.arraycopy(footer, 0, combined, header.length + imageBytes.length, footer.length);
        return combined;
    }

    private OcrResult parseResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            int errorCode = root.path("errorCode").asInt(-1);

            if (errorCode != 0) {
                String msg = root.path("errorMessage").asText("Unknown error");
                log.warn("[OCR] FPT API returned error: code={} msg={}", errorCode, msg);
                return OcrResult.builder().success(false).errorMessage(msg).build();
            }

            JsonNode data = root.path("data");
            if (!data.isArray() || data.isEmpty()) {
                return OcrResult.builder().success(false).errorMessage("No data in OCR response").build();
            }

            JsonNode item = data.get(0);
            return OcrResult.builder()
                    .success(true)
                    .idNumber(item.path("id").asText(null))
                    .fullName(item.path("name").asText(null))
                    .dateOfBirth(item.path("dob").asText(null))
                    .address(item.path("address").asText(null))
                    .type(item.path("type").asText(null))
                    .build();

        } catch (Exception e) {
            log.error("[OCR] Failed to parse FPT response: {}", e.getMessage());
            return OcrResult.builder().success(false).errorMessage("Failed to parse OCR response").build();
        }
    }
}
