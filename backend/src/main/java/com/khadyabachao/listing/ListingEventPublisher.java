package com.khadyabachao.listing;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/** Broadcasts live listing status changes over WebSocket (STOMP). */
@Slf4j
@Service
@RequiredArgsConstructor
public class ListingEventPublisher {

    public static final String DISCOVER_TOPIC = "/topic/discover";

    private final SimpMessagingTemplate messagingTemplate;

    public record ListingEvent(UUID listingId, String type, String status, Instant at) {
    }

    public void listingChanged(UUID listingId, String type, ListingStatus status) {
        ListingEvent event = new ListingEvent(listingId, type, status.name(), Instant.now());
        try {
            messagingTemplate.convertAndSend("/topic/listing/" + listingId, event);
            messagingTemplate.convertAndSend(DISCOVER_TOPIC, event);
        } catch (Exception e) {
            log.warn("Failed to publish listing event: {}", e.getMessage());
        }
    }
}
