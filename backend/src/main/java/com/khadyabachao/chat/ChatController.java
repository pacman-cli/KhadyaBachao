package com.khadyabachao.chat;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Slice;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/requests/{requestId}")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    public record SendMessageRequest(@NotBlank String message) {
    }

    /** REST fallback for sending chat messages (WS is preferred). */
    @PostMapping("/messages")
    public ResponseEntity<ChatService.MessageResponse> send(
        @AuthenticationPrincipal AuthenticatedUser principal,
        @PathVariable UUID requestId,
        @RequestBody SendMessageRequest request) {
        return ResponseEntity.status(201)
            .body(chatService.sendMessage(requestId, principal.id(), request.message()));
    }

    @GetMapping("/messages")
    public ResponseEntity<Slice<ChatService.MessageResponse>> history(
        @AuthenticationPrincipal AuthenticatedUser principal,
        @PathVariable UUID requestId,
        @RequestParam(required = false) Instant before,
        @RequestParam(defaultValue = "0") int page) {
        return ResponseEntity.ok(chatService.history(requestId, principal.id(), before, page));
    }

    // ---------- schedule ----------

    @GetMapping("/schedule")
    public ResponseEntity<ScheduleResponse> getSchedule(
        @AuthenticationPrincipal AuthenticatedUser principal,
        @PathVariable UUID requestId) {
        return ResponseEntity.ok(chatService.getSchedule(requestId, principal.id()));
    }

    @PostMapping("/schedule")
    public ResponseEntity<ScheduleResponse> propose(
        @AuthenticationPrincipal AuthenticatedUser principal,
        @PathVariable UUID requestId,
        @RequestBody ChatService.ProposeScheduleRequest request) {
        return ResponseEntity.ok(chatService.propose(requestId, principal.id(), request));
    }

    @PatchMapping("/schedule/confirm")
    public ResponseEntity<ScheduleResponse> confirm(
        @AuthenticationPrincipal AuthenticatedUser principal,
        @PathVariable UUID requestId) {
        return ResponseEntity.ok(chatService.confirm(requestId, principal.id()));
    }
}
