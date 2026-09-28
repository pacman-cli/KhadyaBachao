package com.khadyabachao.request;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/** Ensures only the donor or recipient of a request can act on it. */
@Component
@RequiredArgsConstructor
public class RequestAccessGuard {

    private final FoodRequestRepository requestRepository;

    public FoodRequest getForParticipant(UUID requestId, UUID userId) {
        FoodRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
        boolean donor = request.getListing().getDonor().getId().equals(userId);
        boolean recipient = request.getRecipient().getId().equals(userId);
        if (!donor && !recipient) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a participant of this request");
        }
        return request;
    }
}
