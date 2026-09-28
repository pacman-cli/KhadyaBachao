package com.khadyabachao.listing;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ListingExpiryJobTest {

    @Mock
    private FoodListingRepository listingRepository;

    @Mock
    private ListingEventPublisher eventPublisher;

    @InjectMocks
    private ListingExpiryJob expiryJob;

    @Test
    void expireOverdueListings_updatesStatusAndPublishesEvent() {
        UUID id = UUID.randomUUID();
        FoodListing overdueListing = FoodListing.builder()
                .id(id)
                .title("Expired Biryani")
                .status(ListingStatus.AVAILABLE)
                .pickupDeadline(Instant.now().minusSeconds(3600))
                .build();

        when(listingRepository.findByStatusAndPickupDeadlineBefore(eq(ListingStatus.AVAILABLE), any(Instant.class)))
                .thenReturn(List.of(overdueListing));

        expiryJob.expireOverdueListings();

        assertThat(overdueListing.getStatus()).isEqualTo(ListingStatus.EXPIRED);
        verify(eventPublisher).listingChanged(id, "EXPIRED", ListingStatus.EXPIRED);
    }
}
