package com.khadyabachao.admin;

import com.khadyabachao.listing.FoodListing;
import com.khadyabachao.listing.FoodListingRepository;
import com.khadyabachao.listing.ListingStatus;
import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FoodListingRepository listingRepository;

    @InjectMocks
    private ReportService reportService;

    @Test
    void setStatus_resolved_cancelsListingTarget() {
        UUID reportId = UUID.randomUUID();
        UUID listingId = UUID.randomUUID();
        User reporter = User.builder().id(UUID.randomUUID()).name("Reporter").build();

        Report report = Report.builder()
                .id(reportId)
                .reporter(reporter)
                .targetType(ReportTargetType.LISTING)
                .targetId(listingId)
                .status(ReportStatus.OPEN)
                .reason("Spam listing")
                .build();

        FoodListing listing = FoodListing.builder()
                .id(listingId)
                .title("Spam Food")
                .status(ListingStatus.AVAILABLE)
                .build();

        when(reportRepository.findById(reportId)).thenReturn(Optional.of(report));
        when(listingRepository.findById(listingId)).thenReturn(Optional.of(listing));
        when(reportRepository.save(any(Report.class))).thenAnswer(i -> i.getArgument(0));

        ReportService.ReportResponse response = reportService.setStatus(reportId, ReportStatus.RESOLVED);

        assertThat(response.status()).isEqualTo(ReportStatus.RESOLVED);
        assertThat(response.reporterName()).isEqualTo("Reporter");
        assertThat(listing.getStatus()).isEqualTo(ListingStatus.CANCELLED);
        verify(listingRepository).save(listing);
    }

    @Test
    void setStatus_dismissed_doesNotTouchListing() {
        UUID reportId = UUID.randomUUID();
        UUID listingId = UUID.randomUUID();
        Report report = Report.builder()
                .id(reportId)
                .reporter(User.builder().id(UUID.randomUUID()).name("R").build())
                .targetType(ReportTargetType.LISTING)
                .targetId(listingId)
                .status(ReportStatus.OPEN)
                .reason("Spam")
                .build();
        FoodListing listing = FoodListing.builder()
                .id(listingId)
                .title("Food")
                .status(ListingStatus.AVAILABLE)
                .build();

        when(reportRepository.findById(reportId)).thenReturn(Optional.of(report));
        when(reportRepository.save(any(Report.class))).thenAnswer(i -> i.getArgument(0));

        ReportService.ReportResponse response = reportService.setStatus(reportId, ReportStatus.DISMISSED);

        assertThat(response.status()).isEqualTo(ReportStatus.DISMISSED);
        assertThat(listing.getStatus()).isEqualTo(ListingStatus.AVAILABLE);
        verify(listingRepository, never()).save(any());
    }

    @Test
    void setStatus_missingReport_throws404() {
        when(reportRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> reportService.setStatus(UUID.randomUUID(), ReportStatus.RESOLVED))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void create_validatesListingTargetExists_andMapsReporter() {
        UUID reporterId = UUID.randomUUID();
        UUID listingId = UUID.randomUUID();
        User reporter = User.builder().id(reporterId).name("Reporter").build();

        when(listingRepository.findById(listingId)).thenReturn(Optional.of(
                FoodListing.builder().id(listingId).title("L").build()));
        when(userRepository.findById(reporterId)).thenReturn(Optional.of(reporter));
        when(reportRepository.saveAndFlush(any(Report.class))).thenAnswer(i -> i.getArgument(0));

        ReportService.ReportResponse response =
                reportService.create(reporterId, ReportTargetType.LISTING, listingId, "  bad listing  ");

        ArgumentCaptor<Report> captor = ArgumentCaptor.forClass(Report.class);
        verify(reportRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getReporter()).isSameAs(reporter);
        assertThat(captor.getValue().getReason()).isEqualTo("bad listing");
        assertThat(response.targetType()).isEqualTo(ReportTargetType.LISTING);
    }

    @Test
    void create_missingUserTarget_throws404() {
        when(userRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                reportService.create(UUID.randomUUID(), ReportTargetType.USER, UUID.randomUUID(), "abuse"))
                .isInstanceOf(ResponseStatusException.class);
        verify(reportRepository, never()).save(any());
    }
}
