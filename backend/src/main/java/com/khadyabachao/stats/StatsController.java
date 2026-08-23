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
    private final JdbcTemplate jdbc;

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
    @GetMapping("/system")
    public SystemStats system() {
        List<SystemStats.DailyRow> daily = jdbc.query(
            "SELECT date, total_kg_rescued, total_listings, total_completed_pickups "
                + "FROM stats_daily ORDER BY date DESC LIMIT 14",
            (rs, i) -> new SystemStats.DailyRow(
                rs.getDate("date").toLocalDate(),
                rs.getDouble("total_kg_rescued"),
                rs.getInt("total_listings"),
                rs.getInt("total_completed_pickups")));

        return new SystemStats(
            listingRepository.count(),
            listingRepository.countByStatus(com.khadyabachao.listing.ListingStatus.COMPLETED),
            listingRepository.sumRescuedTotal(),
            daily,
            listingRepository.topDonors(PageRequest.of(0, 5)));
    }
}
