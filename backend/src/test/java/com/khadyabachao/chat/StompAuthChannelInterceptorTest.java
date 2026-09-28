package com.khadyabachao.chat;

import com.khadyabachao.config.JwtService;
import com.khadyabachao.request.FoodRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Audit B18: SUBSCRIBE frames must be authorized. Chat topics are
 * participant-only (previously ANY websocket client could eavesdrop on
 * private pickup chats); public listing/discover topics stay open; unknown
 * topics fail closed.
 */
@ExtendWith(MockitoExtension.class)
class StompAuthChannelInterceptorTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private FoodRequestRepository foodRequestRepository;

    @Mock
    private com.khadyabachao.user.UserRepository userRepository;

    @InjectMocks
    private StompAuthChannelInterceptor interceptor;

    private final MessageChannel channel = mock(MessageChannel.class);

    private Message<?> subscribe(String destination, UUID userId) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(destination);
        if (userId != null) {
            accessor.setUser(new UsernamePasswordAuthenticationToken(userId, null, List.of()));
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void chatSubscribe_allowedForParticipant() {
        UUID requestId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(foodRequestRepository.existsParticipant(requestId, userId)).thenReturn(true);

        assertThatCode(() -> interceptor.preSend(subscribe("/topic/chat/" + requestId, userId), channel))
            .doesNotThrowAnyException();
    }

    @Test
    void chatSubscribe_deniedForNonParticipant() {
        UUID requestId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(foodRequestRepository.existsParticipant(requestId, userId)).thenReturn(false);

        assertThatThrownBy(() -> interceptor.preSend(subscribe("/topic/chat/" + requestId, userId), channel))
            .isInstanceOf(MessagingException.class)
            .hasMessageContaining("Not a participant");
    }

    @Test
    void chatSubscribe_deniedWithoutAuthentication() {
        UUID requestId = UUID.randomUUID();

        assertThatThrownBy(() -> interceptor.preSend(subscribe("/topic/chat/" + requestId, null), channel))
            .isInstanceOf(MessagingException.class)
            .hasMessageContaining("Authentication required");

        verify(foodRequestRepository, never()).existsParticipant(any(), any());
    }

    @Test
    void chatSubscribe_deniedForMalformedRequestId() {
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() -> interceptor.preSend(subscribe("/topic/chat/not-a-uuid", userId), channel))
            .isInstanceOf(MessagingException.class)
            .hasMessageContaining("Invalid chat topic");
    }

    @Test
    void publicListingTopic_openToEveryone() {
        assertThatCode(() -> interceptor.preSend(subscribe("/topic/listing/some-id", null), channel))
            .doesNotThrowAnyException();
        assertThatCode(() -> interceptor.preSend(subscribe("/topic/discover", null), channel))
            .doesNotThrowAnyException();
    }

    @Test
    void unknownTopic_failsClosed() {
        assertThatThrownBy(() -> interceptor.preSend(subscribe("/topic/admin/secrets", null), channel))
            .isInstanceOf(MessagingException.class)
            .hasMessageContaining("not allowed");

        verify(foodRequestRepository, never()).existsParticipant(any(), eq(null));
    }
}
