package com.khadyabachao.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Dev fallback: writes notifications to the log instead of pushing.
 * Replaced by FcmNotificationService when app.firebase.enabled=true.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "app.firebase.enabled", havingValue = "false", matchIfMissing = true)
@RequiredArgsConstructor
public class LogNotificationService implements NotificationService {

    private final DeviceTokenRepository deviceTokenRepository;

    @Override
    public void sendToUsers(List<UUID> userIds, String title, String body, Map<String, String> data) {
        if (userIds.isEmpty()) {
            return;
        }
        int devices = deviceTokenRepository.findTokensByUserIds(userIds).size();
        log.info("PUSH (dev-log) -> users={} devices={} | {} : {} | data={}",
            userIds.size(), devices, title, body, data);
    }
}
