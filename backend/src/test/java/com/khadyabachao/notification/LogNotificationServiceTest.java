package com.khadyabachao.notification;

import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LogNotificationServiceTest {

    @Mock
    private DeviceTokenRepository deviceTokenRepository;

    @Mock
    private NotificationRecordRepository notificationRecordRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private LogNotificationService logNotificationService;

    @Test
    void sendToUsers_logsNotificationWhenUsersPresent() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).name("Test User").build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(deviceTokenRepository.findTokensByUserIds(List.of(userId)))
                .thenReturn(List.of("token123"));

        logNotificationService.sendToUsers(List.of(userId), "Test Title", "Test Body", Map.of("key", "val"));

        verify(deviceTokenRepository).findTokensByUserIds(List.of(userId));
        verify(notificationRecordRepository).save(any(NotificationRecord.class));
    }

    @Test
    void sendToUsers_earlyReturnWhenEmptyList() {
        logNotificationService.sendToUsers(List.of(), "Title", "Body", Map.of());
        verifyNoInteractions(deviceTokenRepository);
    }
}
