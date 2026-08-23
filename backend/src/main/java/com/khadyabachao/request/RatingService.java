package com.khadyabachao.request;

import com.khadyabachao.listing.ListingStatus;
import com.khadyabachao.notification.NotificationService;
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

    private final RatingRepository ratingRepository;
    private final FoodRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public Rating rate(UUID requestId, UUID raterId, RateRequest input) {
        FoodRequest request = requestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));

        if (!request.getRecipient().getId().equals(raterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the recipient can rate this pickup");
        }
        if (request.getListing().getStatus() != ListingStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You can rate after the pickup is completed");
        }
        if (ratingRepository.existsByRequestId(requestId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already rated");
        }

        var donor = request.getListing().getDonor();
        ratingRepository.save(Rating.builder()
            .request(request)
            .ratedUser(donor)
            .rating(input.rating())
            .comment(input.comment())
            .build());

        double avg = ratingRepository.averageRatingFor(donor.getId());
        donor.setRatingAvg(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
        userRepository.save(donor);

        notificationService.sendToUsers(
            List.of(donor.getId()),
            "You received a new rating",
            "Someone rated your \"" + request.getListing().getTitle() + "\" " + input.rating + "/5.",
            Map.of("type", "RATING", "requestId", requestId.toString()));

        return findByRequestId(requestId);
    }

    @Transactional(readOnly = true)
    public Rating findByRequestId(UUID requestId) {
        return ratingRepository.findByRequestId(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not rated yet"));
    }
}
