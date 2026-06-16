package com.ecommerce.product.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

@Service
@Slf4j
public class CategoryImageUploadService {

    @Value("${aws.access-key}")
    private String accessKey;

    @Value("${aws.secret-key}")
    private String secretKey;

    @Value("${aws.s3.category-bucket:ecommerce-pool-zora}")
    private String categoryBucket;

    @Value("${aws.s3.category-region:ap-southeast-2}")
    private String categoryRegion;

    public String uploadImage(MultipartFile file) throws IOException {
        String original = file.getOriginalFilename();
        String ext = (original != null && original.contains("."))
                ? original.substring(original.lastIndexOf('.'))
                : "";
        String key = "categories/" + UUID.randomUUID() + ext;

        S3Client s3 = buildS3Client();
        s3.putObject(
                PutObjectRequest.builder()
                        .bucket(categoryBucket)
                        .key(key)
                        .contentType(file.getContentType())
                        .build(),
                RequestBody.fromInputStream(file.getInputStream(), file.getSize())
        );

        String url = "https://" + categoryBucket + ".s3." + categoryRegion + ".amazonaws.com/" + key;
        log.info("Category image uploaded: {}", url);
        return url;
    }

    public void deleteImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) return;
        try {
            // URL format: https://{bucket}.s3.{region}.amazonaws.com/{key}
            String marker = ".amazonaws.com/";
            int idx = imageUrl.indexOf(marker);
            if (idx == -1) return;
            String key = imageUrl.substring(idx + marker.length());
            buildS3Client().deleteObject(DeleteObjectRequest.builder()
                    .bucket(categoryBucket)
                    .key(key)
                    .build());
            log.info("Category image deleted from S3: {}", key);
        } catch (Exception e) {
            log.warn("Failed to delete category image from S3: {}", imageUrl, e);
        }
    }

    private S3Client buildS3Client() {
        return S3Client.builder()
                .region(Region.of(categoryRegion))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
    }
}
