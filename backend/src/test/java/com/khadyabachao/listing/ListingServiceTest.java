package com.khadyabachao.listing;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ListingServiceTest {

    @Mock
    private FoodListingRepository listingRepository;

    @InjectMocks
    private ListingService listingService;

    private FoodListing sampleListing;

    @BeforeEach
    void setUp() {
        sampleListing = FoodListing.builder()
                .id(UUID.randomUUID())
                .title("Fresh Rice & Curry")
                .foodType(FoodType.COOKED)
                .quantityValue(BigDecimal.valueOf(25))
                .quantityUnit("plates")
                .pickupLat(23.7806)
                .pickupLng(90.4193)
                .pickupDeadline(Instant.now().plusSeconds(7200))
                .status(ListingStatus.AVAILABLE)
                .build();
    }

    @Test
    void nearby_passesCorrectParametersToRepository() {
        when(listingRepository.findNearby(
                eq(23.7806), eq(90.4193), eq(5000.0),
                eq("COOKED"), eq(10.0), eq(50.0), eq(false), any(Pageable.class)))
                .thenReturn(List.of(sampleListing));

        List<ListingResponse> result = listingService.nearby(
                23.7806, 90.4193, 5.0, null,
                FoodType.COOKED, 10.0, 50.0, false, 0, 10);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).title()).isEqualTo("Fresh Rice & Curry");
    }

    @Test
    void browse_defaultsToAvailableStatusWhenNotExpired() {
        Page<FoodListing> page = new PageImpl<>(List.of(sampleListing));
        when(listingRepository.browseListings(
                eq(ListingStatus.AVAILABLE), eq(null), eq(null), eq(null), eq(false), any(Pageable.class)))
                .thenReturn(page);

        Page<ListingResponse> result = listingService.browse(
                null, null, null, null, false, PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).status()).isEqualTo(ListingStatus.AVAILABLE);
    }
}
