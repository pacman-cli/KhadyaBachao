package com.khadyabachao.common;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.net.URI;
import java.util.UUID;

/**
 * Cloudflare R2 object storage provider (S3-compatible API).
 * Activated when app.storage.provider=r2 or app.storage.provider=cloudflare.
 * R2 offers 10 GB free monthly storage with zero egress fees.
 */
@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "r2")
@Slf4j
public class CloudflareR2StorageService implements StorageService {

    @Value("${app.cloudflare.r2.account-id:}")
    private String accountId;

    @Value("${app.cloudflare.r2.access-key-id:}")
    private String accessKeyId;

    @Value("${app.cloudflare.r2.secret-access-key:}")
    private String secretAccessKey;

    @Value("${app.cloudflare.r2.bucket-name:khadya-bachao-uploads}")
    private String bucketName;

    @Value("${app.cloudflare.r2.public-url-prefix:}")
    private String publicUrlPrefix;

    private S3Client s3Client;

    @PostConstruct
    void init() {
        if (accountId.isBlank() || accessKeyId.isBlank() || secretAccessKey.isBlank()) {
            log.warn("Cloudflare R2 credentials missing; app.storage.provider=r2 requires account-id, access-key-id, secret-access-key.");
            return;
        }

        URI endpoint = URI.create(String.format("https://%s.r2.cloudflarestorage.com", accountId));
        this.s3Client = S3Client.builder()
                .endpointOverride(endpoint)
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
                .region(Region.US_EAST_1) // R2 uses auto / us-east-1 for S3 SDK compatibility
                .build();
        log.info("Cloudflare R2 storage initialized for bucket: {}", bucketName);
    }

    @Override
    public String store(MultipartFile file, String extension) throws IOException {
        if (s3Client == null) {
            // Misconfiguration must surface: a fake URL would be stored on the
            // listing and nothing would ever serve it.
            throw new IllegalStateException(
                "Cloudflare R2 storage is selected (app.storage.provider=r2) but credentials are missing; "
                + "set CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID and CLOUDFLARE_R2_SECRET_ACCESS_KEY.");
        }

        String key = "uploads/" + UUID.randomUUID() + extension;

        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(file.getContentType())
                .build();

        s3Client.putObject(putRequest, RequestBody.fromBytes(file.getBytes()));
        log.info("Uploaded file to Cloudflare R2 bucket {}: key={}", bucketName, key);

        if (!publicUrlPrefix.isBlank()) {
            String prefix = publicUrlPrefix.endsWith("/") ? publicUrlPrefix.substring(0, publicUrlPrefix.length() - 1) : publicUrlPrefix;
            return prefix + "/" + key;
        }

        // Default R2 dev domain format or endpoint fallback
        return String.format("https://%s.r2.cloudflarestorage.com/%s/%s", accountId, bucketName, key);
    }
}
