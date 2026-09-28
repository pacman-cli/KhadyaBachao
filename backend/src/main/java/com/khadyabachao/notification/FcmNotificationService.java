package com.khadyabachao.notification;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.khadyabachao.user.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@ConditionalOnProperty(name = "app.firebase.enabled", havingValue = "true")
@RequiredArgsConstructor
public class FcmNotificationService implements NotificationService {

    @Value("${app.firebase.credentials-path}")
    private String credentialsPath;

    private final DeviceTokenRepository deviceTokenRepository;
    private final NotificationRecordRepository notificationRecordRepository;
    private final UserRepository userRepository;

    private FirebaseMessaging messaging;

    @PostConstruct
    void init() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            try (FileInputStream in = new FileInputStream(credentialsPath)) {
                var options = com.google.firebase.FirebaseOptions.builder()
                    .setCredentials(com.google.auth.oauth2.GoogleCredentials.fromStream(in))
                    .build();
                FirebaseApp.initializeApp(options);
            }
        }
        messaging = FirebaseMessaging.getInstance();
        log.info("FCM push notifications initialised");
    }

    @Override
    @Transactional
    public void sendToUsers(List<UUID> userIds, String title, String body, Map<String, String> data) {
        if (userIds == null || userIds.isEmpty()) {
            return;
        }

        String type = data != null ? data.getOrDefault("type", "GENERAL") : "GENERAL";
        String dataJson = NotificationDataJson.toJson(data);

        // Persist notification records to DB
        for (UUID userId : userIds) {
            userRepository.findById(userId).ifPresent(user -> {
                notificationRecordRepository.save(NotificationRecord.builder()
                    .user(user)
                    .title(title)
                    .body(body)
                    .type(type)
                    .dataJson(dataJson)
                    .read(false)
                    .build());
            });
        }

        // Send FCM push notifications
        List<String> tokens = deviceTokenRepository.findTokensByUserIds(userIds);
        for (String token : tokens) {
            try {
                messaging.send(Message.builder()
                    .setToken(token)
                    .setNotification(Notification.builder().setTitle(title).setBody(body).build())
                    .putAllData(data)
                    .build());
            } catch (Exception e) {
                log.warn("Failed to push to token {}: {}", token, e.getMessage());
            }
        }
    }
}
