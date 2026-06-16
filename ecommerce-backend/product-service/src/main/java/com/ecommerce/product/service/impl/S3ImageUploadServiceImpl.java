package com.ecommerce.product.service.impl;

import com.ecommerce.product.service.ImageUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class S3ImageUploadServiceImpl implements ImageUploadService {

    private final S3Client s3Client;

    @Value("${aws.s3.bucket}")
    private String bucketName;

    @Override
    public String uploadImage(MultipartFile file) throws IOException {

        // 1. Tạo tên file độc nhất để không bị trùng (vd: a1b2c-iphone.jpg)
        String originalFilename = file.getOriginalFilename();
        String uniqueFileName = UUID.randomUUID().toString() + "_" + originalFilename;

        // 2. Chuyển đổi File để chuẩn bị đóng gói ném lên AWS
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(uniqueFileName)
                .contentType(file.getContentType())
                .build();

        // 3. Thực hiện ném File lên mây (Thực thi)
        log.info("Bắt đầu đẩy file {} lên S3 Bucket: {}", uniqueFileName, bucketName);
        s3Client.putObject(
                putObjectRequest,
                RequestBody.fromInputStream(file.getInputStream(), file.getSize())
        );

        // 4. Trả về cái Link công khai (URL) để Frontend đem đi dùng
        String fileUrl = "https://" + bucketName + ".s3.amazonaws.com/" + uniqueFileName;
        log.info("Tải lên S3 thành công. Link public: {}", fileUrl);

        return fileUrl;
    }

    @Override
    public void deleteImage(String imageUrl) {
        // Trích key từ URL: https://{bucket}.s3.amazonaws.com/{key}
        String key = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
        log.info("Xóa file S3: {}", key);
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build());
    }
}
