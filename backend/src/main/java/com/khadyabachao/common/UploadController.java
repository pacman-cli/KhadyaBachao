package com.khadyabachao.common;

import java.io.IOException;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;

/**
 * Dev image upload to local disk. Swap the storage call for S3/Firebase Storage
 * in production; the API contract ({url} in response) stays identical.
 */
@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadController {

    private static final Set<MediaType> ALLOWED = Set.of(
            MediaType.parseMediaType(MediaType.IMAGE_JPEG_VALUE),
            MediaType.parseMediaType(MediaType.IMAGE_PNG_VALUE),
            MediaType.parseMediaType("image/webp"));

    private static final byte[] PNG_SIGNATURE = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] RIFF = {'R', 'I', 'F', 'F'};
    private static final byte[] WEBP = {'W', 'E', 'B', 'P'};

    private static final long MAX_SIZE = 5 * 1024 * 1024;

    private final StorageService storageService;

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

        // Audit B39: the declared content type is client-controlled, so an
        // arbitrary file renamed with an image/* header would otherwise be
        // stored and served. Sniff the actual bytes and require them to agree
        // with the declared type; the stored extension derives from the bytes.
        String sniffed = sniffImageType(file);
        if (sniffed == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "File content is not a valid JPEG/PNG/WebP image"));
        }
        if (!type.getSubtype().equalsIgnoreCase(sniffed)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "File content does not match its declared image type"));
        }

        String ext = switch (sniffed) {
            case "png" -> ".png";
            case "webp" -> ".webp";
            default -> ".jpg";
        };

        String url = storageService.store(file, ext);
        return ResponseEntity.ok(Map.of("url", url));
    }

    /** Returns "jpeg", "png" or "webp" based on the file's leading bytes, else null. */
    private static String sniffImageType(MultipartFile file) throws IOException {
        byte[] head = file.getInputStream().readNBytes(12);
        if (head.length >= 3
                && (head[0] & 0xFF) == 0xFF && (head[1] & 0xFF) == 0xD8 && (head[2] & 0xFF) == 0xFF) {
            return "jpeg";
        }
        if (head.length >= 8 && Arrays.equals(Arrays.copyOfRange(head, 0, 8), PNG_SIGNATURE)) {
            return "png";
        }
        if (head.length >= 12 && Arrays.equals(Arrays.copyOfRange(head, 0, 4), RIFF)
                && Arrays.equals(Arrays.copyOfRange(head, 8, 12), WEBP)) {
            return "webp";
        }
        return null;
    }
}
