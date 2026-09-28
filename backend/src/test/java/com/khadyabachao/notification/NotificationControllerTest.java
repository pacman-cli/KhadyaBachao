package com.khadyabachao.notification;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationControllerTest {

    @Mock
    private NotificationRecordRepository notificationRecordRepository;

    @InjectMocks
    private NotificationController notificationController;

    @Test
    void list_returnsUserNotifications() {
        UUID userId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(userId, "user@test.com", UserRole.RECIPIENT_INDIVIDUAL);
        User user = User.builder().id(userId).name("Test User").build();

        NotificationRecord record = NotificationRecord.builder()
                .id(UUID.randomUUID())
                .user(user)
                .title("Claim Approved!")
                .body("Your food claim was approved.")
                .type("CLAIM_APPROVED")
                .read(false)
                .createdAt(Instant.now())
                .build();

        when(notificationRecordRepository.findByUserIdOrderByCreatedAtDesc(eq(userId), any()))
                .thenReturn(new PageImpl<>(List.of(record)));

        ResponseEntity<Page<NotificationController.NotificationResponse>> response =
                notificationController.list(principal, PageRequest.of(0, 20));

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getContent()).hasSize(1);
        assertThat(response.getBody().getContent().get(0).title()).isEqualTo("Claim Approved!");
    }

    @Test
    void unreadCount_returnsUnreadTotal() {
        UUID userId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(userId, "user@test.com", UserRole.RECIPIENT_INDIVIDUAL);

        when(notificationRecordRepository.countByUserIdAndReadFalse(userId)).thenReturn(3L);

        ResponseEntity<Map<String, Long>> response = notificationController.unreadCount(principal);

        assertThat(response.getBody()).containsEntry("unreadCount", 3L);
    }

    @Test
    void markRead_updatesReadStatus() {
        UUID userId = UUID.randomUUID();
        UUID notifId = UUID.randomUUID();
        AuthenticatedUser principal = new AuthenticatedUser(userId, "user@test.com", UserRole.RECIPIENT_INDIVIDUAL);
        User user = User.builder().id(userId).name("Test User").build();

        NotificationRecord record = NotificationRecord.builder()
                .id(notifId)
                .user(user)
                .title("Test")
                .body("Body")
                .type("CLAIM")
                .read(false)
                .build();

        when(notificationRecordRepository.findById(notifId)).thenReturn(Optional.of(record));
        when(notificationRecordRepository.save(any(NotificationRecord.class))).thenAnswer(i -> i.getArgument(0));

        ResponseEntity<NotificationController.NotificationResponse> response = notificationController.markRead(principal, notifId);

        assertThat(response.getBody().read()).isTrue();
        verify(notificationRecordRepository).save(record);
    }
}
