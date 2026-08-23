package com.khadyabachao.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Dev image upload to local disk. Swap the storage call for S3/Firebase Storage
 * in production; the API contract ({url} in response) stays identical.
 */
@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private static final Set<MediaType> ALLOWED = Set.of(
        MediaType.parseMediaType(MediaType.IMAGE_JPEG_VALUE),
        MediaType.parseMediaType(MediaType.IMAGE_PNG_VALUE),
        MediaType.parseMediaType("image/webp"));

    private static final long MAX_SIZE = 5 * 1024 * 1024;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @PostMapping
    public ResponseEntity<Map<String, String>> upload(@RequestPart("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Empty file"));
        }
        if (file.getSize() > MAX_SIZE) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(Map.of("error", "File exceeds 5MB limit"));
        }
        MediaType type = MediaType.parseMediaType(
            StringUtils.hasText(file.getContentType()) ? file.getContentType() : "");
        if (!ALLOWED.contains(type)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only JPEG/PNG/WebP images allowed"));
        }

        String ext = switch (type.getSubtype()) {
            case "png" -> ".png";
            case "webp" -> ".webp";
            default -> ".jpg";
        };
        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(dir);
        Path target = dir.resolve(UUID.randomUUID() + ext);
        try (var in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }

        return ResponseEntity.ok(Map.of("url", "/uploads/" + target.getFileName()));
    }
}
