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
    ScheduleStatus status
) {

    public static ScheduleResponse from(PickupSchedule s) {
        return new ScheduleResponse(
            s.getId(),
            s.getRequest().getId(),
            s.getAgreedTime(),
            s.getAgreedLocation(),
            s.isConfirmedByDonor(),
            s.isConfirmedByRecipient(),
            s.getStatus());
    }
}
