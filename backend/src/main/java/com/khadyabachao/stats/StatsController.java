package com.khadyabachao.stats;

import com.khadyabachao.config.JwtAuthFilter.AuthenticatedUser;
import com.khadyabachao.listing.FoodListingRepository;
import com.khadyabachao.request.FoodRequestRepository;
import com.khadyabachao.user.UserRepository;
import com.khadyabachao.user.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final FoodListingRepository listingRepository;
    private final FoodRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final DailyStatsRepository dailyStatsRepository;

    public record MyStats(
        UserRole role,
        long listingsPosted,
        long pickupsCompleted,
        BigDecimal quantityRescued,
        long claimsMade) {
    }

    /** Personal impact, role-aware. */
    @GetMapping("/me")
    public MyStats me(@AuthenticationPrincipal AuthenticatedUser principal) {
        var user = userRepository.findById(principal.id()).orElseThrow();
        if (user.getRole() == UserRole.DONOR) {
            return new MyStats(
                user.getRole(),
                listingRepository.countByDonorId(user.getId()),
                listingRepository.countByDonorIdAndStatus(user.getId(), com.khadyabachao.listing.ListingStatus.COMPLETED),
                listingRepository.sumRescuedByDonor(user.getId()),
                0);
        }
        return new MyStats(
            user.getRole(),
            0,
            requestRepository.countCompletedByRecipient(user.getId()),
            requestRepository.sumReceivedByRecipient(user.getId()),
            requestRepository.countByRecipientId(user.getId()));
    }

    public record SystemStats(
        long totalListings,
        long completedPickups,
        BigDecimal totalRescued,
        List<DailyRow> daily,
        List<LeaderboardEntry> leaderboard) {

        public record DailyRow(LocalDate date, double rescued, int listings, int pickups) {
        }
    }

    /** Public impact dashboard (no auth required). */
    @GetMapping({"/system", "/summary"})
    public SystemStats system() {
        List<SystemStats.DailyRow> daily = dailyStatsRepository.findTop14ByOrderByDateDesc().stream()
            .map(ds -> new SystemStats.DailyRow(
                ds.getDate(),
                ds.getTotalKgRescued().doubleValue(),
                ds.getTotalListings(),
                ds.getTotalCompletedPickups()))
            .toList();

        return new SystemStats(
            listingRepository.count(),
            listingRepository.countByStatus(com.khadyabachao.listing.ListingStatus.COMPLETED),
            listingRepository.sumRescuedTotal(),
            daily,
            listingRepository.topDonors(PageRequest.of(0, 5)));
    }

    public record OrgStats(
        java.util.UUID orgId,
        long claimsMade,
        long pickupsCompleted,
        BigDecimal quantityRescued) {
    }

    @GetMapping("/organization/{id}")
    public OrgStats orgStats(
        @org.springframework.web.bind.annotation.PathVariable java.util.UUID id,
        @org.springframework.security.core.annotation.AuthenticationPrincipal AuthenticatedUser principal) {
        // Impact profiles are personal data — restrict to the caller's own
        // org stats (system-wide aggregates remain public via /stats/system).
        if (!id.equals(principal.id())) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.FORBIDDEN, "You can only view your own organization stats");
        }
        return new OrgStats(
            id,
            requestRepository.countByRecipientId(id),
            requestRepository.countCompletedByRecipient(id),
            requestRepository.sumReceivedByRecipient(id));
    }
}
