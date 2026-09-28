package com.khadyabachao.chat;

import java.security.Principal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

/**
 * Real-time chat over STOMP. Clients publish to /app/chat/{requestId} with a
 * JSON body {"message": "..."}; the persisted message is broadcast to
 * /topic/chat/{requestId}. Sender identity comes from the authenticated
 * STOMP principal (JWT), never from the payload.
 */
@Controller
@RequiredArgsConstructor
public class ChatWsController {

    private final ChatService chatService;

    public record SendPayload(String message) {
    }

    @MessageMapping("/chat/{requestId}")
    public void handleChat(@DestinationVariable UUID requestId,
                           Principal principal,
                           @Payload SendPayload payload) {
        if (principal == null || !(principal.getName() != null && isUuid(principal.getName()))) {
            throw new IllegalArgumentException("Unauthenticated WebSocket session");
        }
        UUID senderId = UUID.fromString(principal.getName());
        chatService.sendMessage(requestId, senderId, payload.message());
    }

    private boolean isUuid(String value) {
        try {
            UUID.fromString(value);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
