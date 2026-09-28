package com.khadyabachao.request;

import com.khadyabachao.listing.FoodListing;
import com.khadyabachao.listing.ListingStatus;
import com.khadyabachao.notification.NotificationService;
import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import com.khadyabachao.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RatingServiceTest {

    @Mock
    private RatingRepository ratingRepository;

    @Mock
    private FoodRequestRepository requestRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private RatingService ratingService;

    private User donor;
    private User recipient;
    private FoodListing listing;
    private FoodRequest request;
    private UUID requestId;

    @BeforeEach
    void setUp() {
        requestId = UUID.randomUUID();
        donor = User.builder().id(UUID.randomUUID()).name("Donor User").role(UserRole.DONOR).build();
        recipient = User.builder().id(UUID.randomUUID()).name("Recipient NGO").role(UserRole.RECIPIENT_NGO).build();

        listing = FoodListing.builder()
                .id(UUID.randomUUID())
                .donor(donor)
                .title("Biryani")
                .status(ListingStatus.COMPLETED)
                .build();

        request = FoodRequest.builder()
                .id(requestId)
                .listing(listing)
                .recipient(recipient)
                .status(RequestStatus.ACCEPTED)
                .build();
    }

    @Test
    void rate_recipientRatesDonor_success() {
        when(requestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(userRepository.findById(recipient.getId())).thenReturn(Optional.of(recipient));
        when(ratingRepository.existsByRequestIdAndRaterId(requestId, recipient.getId())).thenReturn(false);

        when(ratingRepository.save(any(Rating.class))).thenAnswer(i -> {
            Rating r = i.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });
        when(ratingRepository.averageRatingFor(donor.getId())).thenReturn(4.5);
        when(ratingRepository.averageRatingForRole(donor.getId(), "DONOR")).thenReturn(4.5);
        when(ratingRepository.averageRatingForRole(donor.getId(), "RECIPIENT")).thenReturn(0.0);

        RatingService.RatingResponse response = ratingService.rate(
                requestId, recipient.getId(), new RatingService.RateRequest(5, "Great food!"));

        assertThat(response.rating()).isEqualTo(5);
        assertThat(response.targetRole()).isEqualTo("DONOR");
        assertThat(response.ratedUserId()).isEqualTo(donor.getId());

        assertThat(donor.getRatingAvg()).isEqualTo(new BigDecimal("4.50"));
        assertThat(donor.getDonorRatingAvg()).isEqualTo(new BigDecimal("4.50"));
        verify(userRepository).save(donor);
    }

    @Test
    void rate_donorRatesRecipient_success() {
        when(requestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(userRepository.findById(donor.getId())).thenReturn(Optional.of(donor));
        when(ratingRepository.existsByRequestIdAndRaterId(requestId, donor.getId())).thenReturn(false);

        when(ratingRepository.save(any(Rating.class))).thenAnswer(i -> {
            Rating r = i.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });
        when(ratingRepository.averageRatingFor(recipient.getId())).thenReturn(5.0);
        when(ratingRepository.averageRatingForRole(recipient.getId(), "DONOR")).thenReturn(0.0);
        when(ratingRepository.averageRatingForRole(recipient.getId(), "RECIPIENT")).thenReturn(5.0);

        RatingService.RatingResponse response = ratingService.rate(
                requestId, donor.getId(), new RatingService.RateRequest(5, "Punctual pickup!"));

        assertThat(response.rating()).isEqualTo(5);
        assertThat(response.targetRole()).isEqualTo("RECIPIENT");
        assertThat(response.ratedUserId()).isEqualTo(recipient.getId());

        assertThat(recipient.getRecipientRatingAvg()).isEqualTo(new BigDecimal("5.00"));
        verify(userRepository).save(recipient);
    }

    @Test
    void rate_duplicateRating_throwsConflict() {
        when(requestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(userRepository.findById(recipient.getId())).thenReturn(Optional.of(recipient));
        when(ratingRepository.existsByRequestIdAndRaterId(requestId, recipient.getId())).thenReturn(true);

        assertThatThrownBy(() -> ratingService.rate(
                requestId, recipient.getId(), new RatingService.RateRequest(5, "Duplicate")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("already rated");
    }
}
