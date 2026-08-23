package com.khadyabachao.chat;

import com.khadyabachao.config.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Authenticates STOMP clients: reads the backend JWT from the CONNECT frame's
 * Authorization header and attaches it as the WebSocket principal.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
            MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            Object nativeHeaders = accessor.getHeader("nativeHeaders");
            String token = extractAuthorization(nativeHeaders);
            if (token != null) {
                try {
                    UUID userId = jwtService.validateAndParse(token);
                    accessor.setUser(new UsernamePasswordAuthenticationToken(
                        userId, null, List.of()));
                } catch (Exception ignored) {
                    // invalid token -> principal stays null; chat controller rejects
                }
            }
        }
        return message;
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
