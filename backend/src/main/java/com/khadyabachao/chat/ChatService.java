package com.khadyabachao.chat;

import com.khadyabachao.notification.NotificationService;
import com.khadyabachao.request.FoodRequest;
import com.khadyabachao.request.RequestAccessGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatService {

    public record MessageResponse(
        UUID id,
        UUID requestId,
        UUID senderId,
        String senderName,
        String message,
        Instant sentAt) {

        public static MessageResponse from(ChatMessage m) {
            return new MessageResponse(
                m.getId(),
                m.getRequest().getId(),
                m.getSender().getId(),
                m.getSender().getName(),
                m.getMessage(),
                m.getSentAt());
        }
    }

    private static final int PAGE_SIZE = 50;

    private final ChatMessageRepository chatMessageRepository;
    private final PickupScheduleRepository scheduleRepository;
    private final RequestAccessGuard accessGuard;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    @Transactional
    public MessageResponse sendMessage(UUID requestId, UUID senderId, String text) {
        if (text == null || text.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message cannot be empty");
        }
        FoodRequest request = accessGuard.getForParticipant(requestId, senderId);

        ChatMessage saved = chatMessageRepository.save(ChatMessage.builder()
            .request(request)
            .sender(request.getRecipient().getId().equals(senderId)
                ? request.getRecipient()
                : request.getListing().getDonor())
            .message(text.strip())
            .build());

        MessageResponse response = MessageResponse.from(saved);
        messagingTemplate.convertAndSend("/topic/chat/" + requestId, response);

        UUID otherParty = request.getRecipient().getId().equals(senderId)
            ? request.getListing().getDonor().getId()
            : request.getRecipient().getId();
        notificationService.sendToUsers(
            List.of(otherParty),
            "New message",
            request.getListing().getTitle() + ": " + saved.getMessage(),
            Map.of("type", "CHAT", "requestId", requestId.toString()));

        return response;
    }

    @Transactional(readOnly = true)
    public Slice<MessageResponse> history(UUID requestId, UUID userId, Instant before, int page) {
        accessGuard.getForParticipant(requestId, userId);
        Pageable pageable = PageRequest.of(Math.max(page, 0), PAGE_SIZE);
        Slice<ChatMessage> slice = before != null
            ? chatMessageRepository.findHistoryBefore(requestId, before, pageable)
            : chatMessageRepository.findHistoryAll(requestId, pageable);
        return slice.map(MessageResponse::from);
    }

    // ---------- pickup scheduling ----------

    public record ProposeScheduleRequest(Instant agreedTime, String agreedLocation) {
    }

    @Transactional
    public ScheduleResponse propose(UUID requestId, UUID userId, ProposeScheduleRequest input) {
        FoodRequest request = accessGuard.getForParticipant(requestId, userId);
        if (input.agreedTime() == null || !input.agreedTime().isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pickup time must be in the future");
        }
        if (input.agreedLocation() == null || input.agreedLocation().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pickup location is required");
        }

        boolean donor = request.getListing().getDonor().getId().equals(userId);

        PickupSchedule schedule = scheduleRepository.findByRequestId(requestId)
            .orElseGet(() -> PickupSchedule.builder().request(request).build());

        schedule.setAgreedTime(input.agreedTime());
        schedule.setAgreedLocation(input.agreedLocation().strip());
        if (donor) {
            schedule.setConfirmedByDonor(true);
        } else {
            schedule.setConfirmedByRecipient(true);
        }
        resolveConfirmation(schedule);

        schedule = scheduleRepository.save(schedule);
        notifyCounterpart(request, userId, "Pickup " + schedule.getStatus().name().toLowerCase(),
            "Pickup for \"" + request.getListing().getTitle() + "\" was proposed/updated.");
        return ScheduleResponse.from(schedule);
    }

    @Transactional
    public ScheduleResponse confirm(UUID requestId, UUID userId) {
        FoodRequest request = accessGuard.getForParticipant(requestId, userId);
        PickupSchedule schedule = scheduleRepository.findByRequestId(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No schedule proposed yet"));

        boolean donor = request.getListing().getDonor().getId().equals(userId);
        if (donor) {
            schedule.setConfirmedByDonor(true);
        } else {
            schedule.setConfirmedByRecipient(true);
        }
        resolveConfirmation(schedule);

        schedule = scheduleRepository.save(schedule);
        notifyCounterpart(request, userId, "Pickup confirmed",
            "Pickup for \"" + request.getListing().getTitle() + "\" is now "
                + schedule.getStatus().name().toLowerCase() + ".");
        return ScheduleResponse.from(schedule);
    }

    @Transactional(readOnly = true)
    public ScheduleResponse getSchedule(UUID requestId, UUID userId) {
        accessGuard.getForParticipant(requestId, userId);
        return scheduleRepository.findByRequestId(requestId)
            .map(ScheduleResponse::from)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No schedule proposed yet"));
    }

    private void resolveConfirmation(PickupSchedule schedule) {
        boolean bothConfirmed = schedule.isConfirmedByDonor() && schedule.isConfirmedByRecipient();
        if (schedule.getStatus() == ScheduleStatus.COMPLETED
                || schedule.getStatus() == ScheduleStatus.CANCELLED) {
            return;
        }
        schedule.setStatus(bothConfirmed ? ScheduleStatus.CONFIRMED : ScheduleStatus.PROPOSED);
    }

    private void notifyCounterpart(FoodRequest request, UUID actorId, String title, String body) {
        UUID otherParty = request.getRecipient().getId().equals(actorId)
            ? request.getListing().getDonor().getId()
            : request.getRecipient().getId();
        notificationService.sendToUsers(List.of(otherParty), title, body,
            Map.of("type", "SCHEDULE", "requestId", request.getId().toString()));
    }
}
