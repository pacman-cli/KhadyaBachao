package com.khadyabachao.common;

import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Bucket;
import com.google.firebase.FirebaseApp;
import com.google.firebase.cloud.StorageClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Cloud storage implementation using Firebase Storage / Cloudflare R2 (S3 compliant).
 * Activated when app.storage.provider=firebase or app.storage.provider=r2.
 * Offers free tier storage (Firebase Storage 5GB free / R2 10GB free/mo).
 */
@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "firebase")
@Slf4j
@RequiredArgsConstructor
public class FirebaseStorageService implements StorageService {

    @Value("${app.firebase.storage-bucket:khadya-bachao.appspot.com}")
    private String bucketName;

    @Override
    public String store(MultipartFile file, String extension) throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            // Misconfiguration must surface: a fake URL would be stored on the
            // listing and nothing would ever serve it.
            throw new IllegalStateException(
                "Firebase Storage is selected (app.storage.provider=firebase) but Firebase is not initialized; "
                + "check FIREBASE_ENABLED and FIREBASE_CREDENTIALS_PATH.");
        }

        String blobName = "uploads/" + UUID.randomUUID() + extension;
        Bucket bucket = StorageClient.getInstance().bucket(bucketName);
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucket.getName(), blobName))
                .setContentType(file.getContentType())
                .build();

        bucket.getStorage().create(blobInfo, file.getBytes());
        log.info("Uploaded file to Firebase Storage bucket {}: {}", bucketName, blobName);

        // Construct public download URL
        return String.format("https://firebasestorage.googleapis.com/v0/b/%s/o/%s?alt=media",
                bucketName, URLEncoder.encode(blobName, StandardCharsets.UTF_8));
    }
}
