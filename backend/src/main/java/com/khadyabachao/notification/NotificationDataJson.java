package com.khadyabachao.notification;

import java.util.Map;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Serializes notification payload maps to JSON for the notifications table. */
final class NotificationDataJson {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private NotificationDataJson() {
    }

    static String toJson(Map<String, String> data) {
        if (data == null || data.isEmpty()) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            // Should never happen for Map<String, String>; fall back to null
            // rather than persisting a non-JSON payload clients must parse.
            return null;
        }
    }
}
