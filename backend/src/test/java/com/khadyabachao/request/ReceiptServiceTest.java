package com.khadyabachao.request;

import com.khadyabachao.chat.PickupSchedule;
import com.khadyabachao.chat.PickupScheduleRepository;
import com.khadyabachao.listing.FoodListing;
import com.khadyabachao.listing.ListingStatus;
import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReceiptServiceTest {

    @Mock
    private FoodRequestRepository requestRepository;

    @Mock
    private PickupScheduleRepository scheduleRepository;

    @InjectMocks
    private ReceiptService receiptService;

    private User donor;
    private User recipient;
    private FoodListing listing;
    private FoodRequest request;
    private UUID requestId;

    @BeforeEach
    void setUp() {
        requestId = UUID.randomUUID();
        donor = User.builder().id(UUID.randomUUID()).name("Star Kabab").role(UserRole.DONOR).build();
        recipient = User.builder().id(UUID.randomUUID()).name("Care NGO").role(UserRole.RECIPIENT_NGO).build();

        listing = FoodListing.builder()
                .id(UUID.randomUUID())
                .donor(donor)
                .title("50 Plates Kacchi Biryani")
                .foodType(com.khadyabachao.listing.FoodType.COOKED)
                .quantityValue(BigDecimal.valueOf(50))
                .quantityUnit("plates")
                .pickupLat(23.7461)
                .pickupLng(90.3742)
                .pickupAddress("Dhanmondi 2, Dhaka")
                .pickupDeadline(Instant.now().plusSeconds(3600))
                .completedAt(Instant.now())
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
    void generateReceiptPdf_returnsPdfBytesForCompletedPickup() {
        when(requestRepository.findById(requestId)).thenReturn(Optional.of(request));
        when(scheduleRepository.findByRequestId(requestId)).thenReturn(Optional.empty());

        byte[] pdfBytes = receiptService.generateReceiptPdf(requestId, recipient.getId());

        assertThat(pdfBytes).isNotEmpty();
        // PDF header magic bytes check: %PDF
        assertThat(new String(pdfBytes, 0, 4)).isEqualTo("%PDF");
    }

    @Test
    void generateReceiptPdf_throwsBadRequestIfListingNotCompleted() {
        listing.setStatus(ListingStatus.CLAIMED);
        when(requestRepository.findById(requestId)).thenReturn(Optional.of(request));

        assertThatThrownBy(() -> receiptService.generateReceiptPdf(requestId, recipient.getId()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("completed pickups");
    }

    @Test
    void generateReceiptPdf_throwsForbiddenForUnrelatedUser() {
        when(requestRepository.findById(requestId)).thenReturn(Optional.of(request));
        UUID randomUser = UUID.randomUUID();

        assertThatThrownBy(() -> receiptService.generateReceiptPdf(requestId, randomUser))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Not authorized");
    }
}
