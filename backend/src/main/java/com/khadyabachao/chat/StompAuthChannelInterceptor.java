package com.khadyabachao.chat;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import com.khadyabachao.config.JwtService;
import com.khadyabachao.request.FoodRequestRepository;
import com.khadyabachao.user.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Authenticates and authorizes STOMP clients (audit B18):
 * - CONNECT: reads the backend JWT from the Authorization header and attaches
 *   it as the WebSocket principal.
 * - SUBSCRIBE: /topic/chat/{requestId} requires an authenticated principal
 *   who is a participant of that request; /topic/listing/* and
 *   /topic/discover* are public by design; anything else is denied
 *   (fail-closed so future private topics cannot silently ship unprotected).
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final String CHAT_TOPIC_PREFIX = "/topic/chat/";
    private static final String PUBLIC_TOPIC_PREFIX = "/topic/listing/";
    private static final String PUBLIC_DISCOVER_PREFIX = "/topic/discover";

    private final JwtService jwtService;
    private final FoodRequestRepository foodRequestRepository;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticateConnect(accessor);
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            authorizeSubscribe(accessor);
        }
        return message;
    }

    private void authenticateConnect(StompHeaderAccessor accessor) {
        Object nativeHeaders = accessor.getHeader("nativeHeaders");
        String token = extractAuthorization(nativeHeaders);
        if (token == null) {
            return;
        }
        try {
            UUID userId = jwtService.validateAndParse(token);
            // REST rejects deactivated users on every request (JwtAuthFilter);
            // mirror that here so a deactivated account's live WS session
            // cannot keep chatting.
            boolean active = userRepository.findById(userId)
                .map(u -> u.isActive())
                .orElse(false);
            if (!active) {
                return;
            }
            accessor.setUser(new UsernamePasswordAuthenticationToken(
                    userId, null, List.of()));
        } catch (Exception ignored) {
            // invalid token -> principal stays null; publish/subscribe guards reject
        }
    }

    private void authorizeSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            throw new MessagingException("SUBSCRIBE requires a destination");
        }

        if (destination.startsWith(CHAT_TOPIC_PREFIX)) {
            UUID userId = currentUserId(accessor.getUser());
            if (userId == null) {
                throw new MessagingException("Authentication required to subscribe to chat topics");
            }
            String requestIdPart = destination.substring(CHAT_TOPIC_PREFIX.length());
            int slash = requestIdPart.indexOf('/');
            if (slash > 0) {
                requestIdPart = requestIdPart.substring(0, slash);
            }
            final UUID requestId;
            try {
                requestId = UUID.fromString(requestIdPart);
            } catch (IllegalArgumentException e) {
                throw new MessagingException("Invalid chat topic");
            }
            // FK-level participant check that never touches lazy associations
            // (this interceptor runs outside any persistence context).
            if (!foodRequestRepository.existsParticipant(requestId, userId)) {
                log.warn("Denied STOMP SUBSCRIBE to {}: user {} is not a participant", destination, userId);
                throw new MessagingException("Not a participant of this chat");
            }
            return;
        }

        boolean isPublic = destination.startsWith(PUBLIC_TOPIC_PREFIX)
            || destination.startsWith(PUBLIC_DISCOVER_PREFIX);
        if (!isPublic) {
            log.warn("Denied STOMP SUBSCRIBE to non-public destination: {}", destination);
            throw new MessagingException("Subscription not allowed: " + destination);
        }
    }

    private UUID currentUserId(Principal principal) {
        if (principal == null || principal.getName() == null) {
            return null;
        }
        try {
            return UUID.fromString(principal.getName());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private String extractAuthorization(Object nativeHeaders) {
        if (nativeHeaders instanceof java.util.Map<?, ?> map) {
            Object values = map.get("Authorization");
            if (values instanceof List<?> list && !list.isEmpty()) {
                String value = String.valueOf(list.get(0));
                return value.startsWith("Bearer ") ? value.substring(7) : value;
            }
        }
        return null;
    }
}
