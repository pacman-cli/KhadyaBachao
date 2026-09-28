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

        var listing = listingRepository.findWithLockById(listingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
        // Role is user-changeable at any time, so a donor could switch to a
        // recipient role and claim their own donation to farm impact stats.
        if (listing.getDonor().getId().equals(recipientId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot claim your own listing");
        }
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

        // The bulk update bypasses the persistence context, so the managed
        // entity still reads AVAILABLE. Align it so the response, events and
        // notifications carry CLAIMED instead of a stale snapshot.
        listing.setStatus(ListingStatus.CLAIMED);

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
            // A released listing whose pickup window already passed can never be
            // claimed again (claim() rejects past deadlines) — it would sit as an
            // undead AVAILABLE row. Expire it instead.
            if (listing.getPickupDeadline().isAfter(Instant.now())) {
                listing.setStatus(ListingStatus.AVAILABLE);
                eventPublisher.listingChanged(listing.getId(), "RELEASED", ListingStatus.AVAILABLE);
            } else {
                listing.setStatus(ListingStatus.EXPIRED);
                eventPublisher.listingChanged(listing.getId(), "EXPIRED", ListingStatus.EXPIRED);
            }
            listingRepository.save(listing);
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
        // Completion means food actually changed hands: a donor can cancel a
        // claimed listing while the request is still ACCEPTED, and completing
        // that would fabricate impact stats, receipts and rating rights.
        var listing = request.getListing();
        if (listing.getStatus() != ListingStatus.CLAIMED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Listing is not awaiting handover");
        }
        request.setStatus(RequestStatus.ACCEPTED); // stays accepted; completion lives on the listing
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

    /**
     * Donor refuses a claim. The claim lifecycle auto-ACCEPTS at claim time
     * (first-claim-wins), so the donor-side "refuse" operates on ACCEPTED
     * requests: the request is REJECTED and the listing is released back to
     * AVAILABLE (or EXPIRED if the pickup window has passed). COMPLETED
     * handovers can never be refused — the food has already changed hands.
     */
    @Transactional
    public RequestResponse rejectClaim(UUID donorId, UUID requestId) {
        FoodRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
        if (!request.getListing().getDonor().getId().equals(donorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your listing");
        }
        if (request.getStatus() != RequestStatus.ACCEPTED
                && request.getStatus() != RequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Only active claims can be rejected");
        }
        var listing = request.getListing();
        if (listing.getStatus() == ListingStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This pickup is already completed and cannot be refused");
        }

        request.setStatus(RequestStatus.REJECTED);
        request.setRespondedAt(Instant.now());
        requestRepository.save(request);

        if (listing.getStatus() == ListingStatus.CLAIMED) {
            // Same undead-row protection as cancelMyClaim: a released listing
            // whose window has passed is EXPIRED, never re-opened.
            if (listing.getPickupDeadline().isAfter(Instant.now())) {
                listing.setStatus(ListingStatus.AVAILABLE);
                eventPublisher.listingChanged(listing.getId(), "REJECTED", ListingStatus.AVAILABLE);
            } else {
                listing.setStatus(ListingStatus.EXPIRED);
                eventPublisher.listingChanged(listing.getId(), "EXPIRED", ListingStatus.EXPIRED);
            }
            listingRepository.save(listing);
        }
        notificationService.sendToUsers(
            List.of(request.getRecipient().getId()),
            "Claim Update",
            "Your claim for \"" + listing.getTitle() + "\" was not accepted.",
            Map.of("type", "CLAIM_REJECTED", "listingId", listing.getId().toString()));

        return RequestResponse.from(request);
    }

    @Transactional(readOnly = true)
    public List<RequestResponse> myRequests(UUID recipientId) {
        var requests = requestRepository.findByRecipientIdOrderByRequestedAtDesc(recipientId);
        // One batched query for "which of these did I already rate" instead of
        // an exists() per row.
        var ratedIds = new java.util.HashSet<>(requestRepository.findRatedRequestIds(
            requests.stream().map(FoodRequest::getId).toList(), recipientId));
        return requests.stream()
            .map(r -> RequestResponse.from(r, ratedIds.contains(r.getId())))
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
