package com.khadyabachao.request;

import com.khadyabachao.listing.FoodListingRepository;
import com.khadyabachao.listing.ListingEventPublisher;
import com.khadyabachao.listing.ListingStatus;
import com.khadyabachao.notification.NotificationService;
import com.khadyabachao.user.UserRepository;
import com.khadyabachao.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClaimService {

    private static final Set<UserRole> ALLOWED_CLAIMERS = Set.of(
        UserRole.RECIPIENT_NGO, UserRole.RECIPIENT_INDIVIDUAL, UserRole.VOLUNTEER);

    private final FoodListingRepository listingRepository;
    private final FoodRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final ListingEventPublisher eventPublisher;
    private final NotificationService notificationService;
    private final RatingRepository ratingRepository;

    @Transactional
    public RequestResponse claim(UUID listingId, UUID recipientId) {
        var recipient = userRepository.findById(recipientId).orElseThrow();
        if (!ALLOWED_CLAIMERS.contains(recipient.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your role cannot claim food");
        }

        var listing = listingRepository.findById(listingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
        if (listing.getStatus() != ListingStatus.AVAILABLE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Listing is no longer available");
        }
        if (!listing.getPickupDeadline().isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Listing pickup window has passed");
        }
        if (requestRepository.existsByListingIdAndRecipientId(listingId, recipientId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already claimed this listing");
        }

        // Atomic transition guards against concurrent claims (first-claim-wins).
        if (listingRepository.claimAtomically(listingId) == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Someone beat you to it — listing already claimed");
        }

        FoodRequest request = requestRepository.save(FoodRequest.builder()
            .listing(listing)
            .recipient(recipient)
            .status(RequestStatus.ACCEPTED)
            .respondedAt(Instant.now())
            .build());

        eventPublisher.listingChanged(listingId, "CLAIMED", ListingStatus.CLAIMED);
        notificationService.sendToUsers(
            List.of(listing.getDonor().getId()),
            "Your food was claimed!",
            recipient.getName() + " claimed \"" + listing.getTitle() + "\"",
            Map.of("type", "CLAIM", "listingId", listingId.toString()));

        return RequestResponse.from(request);
    }

    @Transactional
    public RequestResponse cancelMyClaim(UUID recipientId, UUID requestId) {
        FoodRequest request = ownedRequest(recipientId, requestId);
        if (request.getStatus() != RequestStatus.ACCEPTED && request.getStatus() != RequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This request can no longer be cancelled");
        }
        request.setStatus(RequestStatus.CANCELLED);
        request.setRespondedAt(Instant.now());
        requestRepository.save(request);

        var listing = request.getListing();
        if (listing.getStatus() == ListingStatus.CLAIMED) {
            listing.setStatus(ListingStatus.AVAILABLE);
            listingRepository.save(listing);
            eventPublisher.listingChanged(listing.getId(), "RELEASED", ListingStatus.AVAILABLE);
        }
        return RequestResponse.from(request);
    }

    /** Donor confirms the handover; listing + request become COMPLETED. */
    @Transactional
    public RequestResponse complete(UUID donorId, UUID requestId) {
        FoodRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
        if (!request.getListing().getDonor().getId().equals(donorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your listing");
        }
        if (request.getStatus() != RequestStatus.ACCEPTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only accepted requests can be completed");
        }
        request.setStatus(RequestStatus.ACCEPTED); // stays accepted; completion lives on the listing
        var listing = request.getListing();
        listing.setStatus(ListingStatus.COMPLETED);
        listing.setCompletedAt(java.time.Instant.now());
        listingRepository.save(listing);

        eventPublisher.listingChanged(listing.getId(), "COMPLETED", ListingStatus.COMPLETED);
        notificationService.sendToUsers(
            List.of(request.getRecipient().getId()),
            "Pickup confirmed",
            "The pickup for \"" + listing.getTitle() + "\" was marked complete. Rate it!",
            Map.of("type", "COMPLETED", "listingId", listing.getId().toString()));

        return RequestResponse.from(request);
    }

    @Transactional(readOnly = true)
    public List<RequestResponse> myRequests(UUID recipientId) {
        return requestRepository.findByRecipientIdOrderByRequestedAtDesc(recipientId).stream()
            .map(r -> RequestResponse.from(r, ratingRepository.existsByRequestId(r.getId())))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<RequestResponse> forMyListing(UUID donorId, UUID listingId) {
        var listing = listingRepository.findById(listingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
        if (!listing.getDonor().getId().equals(donorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your listing");
        }
        return requestRepository.findByListingIdOrderByRequestedAtAsc(listingId).stream()
            .map(RequestResponse::from)
            .toList();
    }

    private FoodRequest ownedRequest(UUID recipientId, UUID requestId) {
        FoodRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
        if (!request.getRecipient().getId().equals(recipientId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your request");
        }
        return request;
    }
}
