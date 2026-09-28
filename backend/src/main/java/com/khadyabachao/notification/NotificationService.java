package com.khadyabachao.notification;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Push notification abstraction. Implementations: FCM (prod) and log (dev). */
public interface NotificationService {

    /**
     * Sends a push to every device registered by the given users.
     * Implementations must not throw on individual delivery failures.
     */
    void sendToUsers(List<UUID> userIds, String title, String body, Map<String, String> data);
}
