package com.khadyabachao.listing;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface FoodListingRepository extends JpaRepository<FoodListing, UUID> {

    List<FoodListing> findByDonorIdOrderByCreatedAtDesc(UUID donorId);

    List<FoodListing> findByStatusAndPickupDeadlineBefore(ListingStatus status, Instant deadline);

    /**
     * Radius search using earthdistance. ll_to_earth point <@ earth_box(center, meters)
     * leverages the GiST index; ordering by distance. Optional foodType / minQuantity filters.
     */
    @Query(value = """
        SELECT * FROM food_listings f
        WHERE f.status = 'AVAILABLE'
          AND f.pickup_deadline > now()
          AND ll_to_earth(f.pickup_lat, f.pickup_lng)
                <@ earth_box(ll_to_earth(:lat, :lng), :radiusMeters)
          AND (:foodType IS NULL OR f.food_type = :foodType)
          AND (:minQuantity IS NULL OR f.quantity_value >= :minQuantity)
        ORDER BY earth_distance(ll_to_earth(f.pickup_lat, f.pickup_lng),
                                ll_to_earth(:lat, :lng))
        """,
        nativeQuery = true)
    List<FoodListing> findNearby(double lat, double lng, double radiusMeters,
                                 String foodType, Double minQuantity);

    Page<FoodListing> findByStatus(ListingStatus status, Pageable pageable);

    Page<FoodListing> findByStatusAndFoodType(ListingStatus status, FoodType foodType, Pageable pageable);

    /** Atomic first-claim-wins transition. Returns affected row count (0 = lost race). */
    @Modifying
    @Query("UPDATE FoodListing l SET l.status = 'CLAIMED' WHERE l.id = :id AND l.status = 'AVAILABLE'")
    int claimAtomically(UUID id);

    long countByDonorId(UUID donorId);

    long countByDonorIdAndStatus(UUID donorId, ListingStatus status);

    @Query("SELECT COALESCE(SUM(l.quantityValue), 0) FROM FoodListing l WHERE l.donor.id = :donorId AND l.status = 'COMPLETED'")
    java.math.BigDecimal sumRescuedByDonor(UUID donorId);

    // ---- system-wide ----

    long countByStatus(ListingStatus status);

    long count();

    @Query("SELECT COALESCE(SUM(l.quantityValue), 0) FROM FoodListing l WHERE l.status = 'COMPLETED'")
    java.math.BigDecimal sumRescuedTotal();

    @Query("""
        SELECT new com.khadyabachao.stats.LeaderboardEntry(l.donor.name, SUM(l.quantityValue))
        FROM FoodListing l
        WHERE l.status = 'COMPLETED'
        GROUP BY l.donor.id, l.donor.name
        ORDER BY SUM(l.quantityValue) DESC
        """)
    List<com.khadyabachao.stats.LeaderboardEntry> topDonors(Pageable pageable);

    @Query("SELECT l.status, COUNT(l) FROM FoodListing l GROUP BY l.status")
    List<Object[]> countByStatusGrouped();
}
