package com.khadyabachao.notification;

import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Dev fallback: writes notifications to DB + log instead of pushing via FCM.
 * Replaced by FcmNotificationService when app.firebase.enabled=true.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "app.firebase.enabled", havingValue = "false", matchIfMissing = true)
@RequiredArgsConstructor
public class LogNotificationService implements NotificationService {

    private final DeviceTokenRepository deviceTokenRepository;
    private final NotificationRecordRepository notificationRecordRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public void sendToUsers(List<UUID> userIds, String title, String body, Map<String, String> data) {
        if (userIds == null || userIds.isEmpty()) {
            return;
        }

        String type = data != null ? data.getOrDefault("type", "GENERAL") : "GENERAL";
        String dataJson = NotificationDataJson.toJson(data);

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

        int devices = deviceTokenRepository.findTokensByUserIds(userIds).size();
        log.info("PUSH (dev-log) -> users={} devices={} | {} : {} | data={}",
            userIds.size(), devices, title, body, data);
    }
}
