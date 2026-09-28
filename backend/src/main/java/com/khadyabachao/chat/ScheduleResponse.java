package com.khadyabachao.chat;

import java.time.Instant;
import java.util.UUID;

public record ScheduleResponse(
    UUID id,
    UUID requestId,
    Instant agreedTime,
    String agreedLocation,
    boolean confirmedByDonor,
    boolean confirmedByRecipient,
    ScheduleStatus status,
    // Audit M21: client needs the participant ids to show *whose* confirmation
    // is still pending (per-user state) instead of a single combined flag.
    UUID donorId,
    UUID recipientId
) {

    public static ScheduleResponse from(PickupSchedule s) {
        return new ScheduleResponse(
            s.getId(),
            s.getRequest().getId(),
            s.getAgreedTime(),
            s.getAgreedLocation(),
            s.isConfirmedByDonor(),
            s.isConfirmedByRecipient(),
            s.getStatus(),
            s.getRequest().getListing().getDonor().getId(),
            s.getRequest().getRecipient().getId());
    }
}
