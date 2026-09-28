package com.khadyabachao.request;

import com.khadyabachao.listing.ListingStatus;
import com.khadyabachao.notification.NotificationService;
import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RatingService {

    public record RateRequest(@Min(1) @Max(5) int rating, String comment) {
    }

    public record RatingResponse(
        UUID id,
        UUID requestId,
        UUID raterId,
        String raterName,
        UUID ratedUserId,
        String ratedUserName,
        String targetRole,
        int rating,
        String comment,
        java.time.Instant createdAt) {

        public static RatingResponse from(Rating r) {
            return new RatingResponse(
                r.getId(),
                r.getRequest().getId(),
                r.getRater().getId(),
                r.getRater().getName(),
                r.getRatedUser().getId(),
                r.getRatedUser().getName(),
                r.getTargetRole(),
                r.getRating(),
                r.getComment(),
                r.getCreatedAt());
        }
    }

    private final RatingRepository ratingRepository;
    private final FoodRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public RatingResponse rate(UUID requestId, UUID raterId, RateRequest input) {
        FoodRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));

        if (request.getListing().getStatus() != ListingStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You can rate after the pickup is completed");
        }
        // A cancelled claimant must not rate a pickup she never attended — the
        // listing being COMPLETED can be a later recipient's transaction.
        if (request.getStatus() != RequestStatus.ACCEPTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only completed claims can be rated");
        }

        User rater = userRepository.findById(raterId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        UUID donorId = request.getListing().getDonor().getId();
        UUID recipientId = request.getRecipient().getId();

        User ratedUser;
        String targetRole;

        if (raterId.equals(recipientId)) {
            ratedUser = request.getListing().getDonor();
            targetRole = "DONOR";
        } else if (raterId.equals(donorId)) {
            ratedUser = request.getRecipient();
            targetRole = "RECIPIENT";
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the donor or recipient can rate this pickup");
        }

        if (ratingRepository.existsByRequestIdAndRaterId(requestId, raterId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You have already rated this request");
        }

        Rating rating = ratingRepository.save(Rating.builder()
            .request(request)
            .rater(rater)
            .ratedUser(ratedUser)
            .targetRole(targetRole)
            .rating(input.rating())
            .comment(input.comment() != null ? input.comment().strip() : null)
            .build());

        // Recalculate target user ratings
        recalculateUserRatings(ratedUser);

        notificationService.sendToUsers(
            List.of(ratedUser.getId()),
            "You received a new rating",
            rater.getName() + " rated your pickup " + input.rating() + "/5.",
            Map.of("type", "RATING", "requestId", requestId.toString()));

        return RatingResponse.from(rating);
    }

    /**
     * Audit B30: ratings expose names + free-text comments, so they are only
     * readable by the request's participants (same rule as chat).
     */
    @Transactional(readOnly = true)
    public List<RatingResponse> getRatingsForRequest(UUID requestId, UUID viewerId) {
        FoodRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
        UUID donorId = request.getListing().getDonor().getId();
        UUID recipientId = request.getRecipient().getId();
        if (!viewerId.equals(donorId) && !viewerId.equals(recipientId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a participant of this request");
        }
        return ratingRepository.findByRequestId(requestId).stream()
            .map(RatingResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public RatingResponse getMyRatingForRequest(UUID requestId, UUID userId) {
        return ratingRepository.findByRequestIdAndRaterId(requestId, userId)
            .map(RatingResponse::from)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not rated yet"));
    }

    private void recalculateUserRatings(User user) {
        double overallAvg = ratingRepository.averageRatingFor(user.getId());
        double donorAvg = ratingRepository.averageRatingForRole(user.getId(), "DONOR");
        double recipientAvg = ratingRepository.averageRatingForRole(user.getId(), "RECIPIENT");

        user.setRatingAvg(BigDecimal.valueOf(overallAvg).setScale(2, RoundingMode.HALF_UP));
        user.setDonorRatingAvg(BigDecimal.valueOf(donorAvg).setScale(2, RoundingMode.HALF_UP));
        user.setRecipientRatingAvg(BigDecimal.valueOf(recipientAvg).setScale(2, RoundingMode.HALF_UP));
        userRepository.save(user);
    }
}
