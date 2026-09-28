package com.khadyabachao.notification;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Tag(name = "Notifications", description = "In-app notifications history and unread status")
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRecordRepository notificationRecordRepository;

    public record NotificationResponse(
        UUID id,
        String title,
        String body,
        String type,
        String dataJson,
        boolean read,
        Instant createdAt) {

        public static NotificationResponse from(NotificationRecord n) {
            return new NotificationResponse(
                n.getId(),
                n.getTitle(),
                n.getBody(),
                n.getType(),
                n.getDataJson(),
                n.isRead(),
                n.getCreatedAt());
        }
    }

    @Operation(summary = "Get paginated notification inbox for current user")
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Page<NotificationResponse>> list(
        @AuthenticationPrincipal AuthenticatedUser principal,
        @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(
            notificationRecordRepository.findByUserIdOrderByCreatedAtDesc(principal.id(), pageable)
                .map(NotificationResponse::from));
    }

    @Operation(summary = "Get unread notifications count")
    @GetMapping("/unread-count")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Long>> unreadCount(@AuthenticationPrincipal AuthenticatedUser principal) {
        long count = notificationRecordRepository.countByUserIdAndReadFalse(principal.id());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @Operation(summary = "Mark notification as read")
    @PatchMapping("/{id}/read")
    @Transactional
    public ResponseEntity<NotificationResponse> markRead(
        @AuthenticationPrincipal AuthenticatedUser principal,
        @PathVariable UUID id) {
        NotificationRecord record = notificationRecordRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));

        if (!record.getUser().getId().equals(principal.id())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your notification");
        }

        record.setRead(true);
        return ResponseEntity.ok(NotificationResponse.from(notificationRecordRepository.save(record)));
    }

    @Operation(summary = "Mark all notifications as read")
    @PatchMapping("/read-all")
    @Transactional
    public ResponseEntity<Map<String, Object>> markAllRead(@AuthenticationPrincipal AuthenticatedUser principal) {
        int updated = notificationRecordRepository.markAllReadForUser(principal.id());
        return ResponseEntity.ok(Map.of("updatedCount", updated, "status", "all_read"));
    }
}
