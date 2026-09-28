package com.khadyabachao.listing;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface FoodListingRepository extends JpaRepository<FoodListing, UUID> {

    // ListingResponse.from() reads donor name/role/verified per row — without
    // the fetch this is one extra users query PER ROW on /listings/mine.
    @EntityGraph(attributePaths = "donor")
    List<FoodListing> findByDonorIdOrderByCreatedAtDesc(UUID donorId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT f FROM FoodListing f WHERE f.id = :id")
    java.util.Optional<FoodListing> findWithLockById(UUID id);

    List<FoodListing> findByStatusAndPickupDeadlineBefore(ListingStatus status, Instant deadline);

    /**
     * Radius search using PostGIS ST_DWithin on geography location column.
     * leverages the GiST index (idx_food_listings_postgis_location); ordering by ST_Distance.
     * Optional foodType / minQuantity / maxQuantity / includeExpired filters with pagination.
     */
    @Query(value = """
        SELECT * FROM food_listings f
        WHERE (:includeExpired = true OR (f.status = 'AVAILABLE' AND f.pickup_deadline > now()))
          AND ST_DWithin(f.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)
          AND (:foodType IS NULL OR f.food_type = :foodType)
          AND (:minQuantity IS NULL OR f.quantity_value >= :minQuantity)
          AND (:maxQuantity IS NULL OR f.quantity_value <= :maxQuantity)
        ORDER BY ST_Distance(f.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography)
        """,
        nativeQuery = true)
    List<FoodListing> findNearby(double lat, double lng, double radiusMeters,
                                 String foodType, Double minQuantity, Double maxQuantity, boolean includeExpired,
                                 Pageable pageable);

    @EntityGraph(attributePaths = "donor")
    @Query("""
        SELECT f FROM FoodListing f
        WHERE (:includeExpired = true OR f.status = :status)
          AND (:foodType IS NULL OR f.foodType = :foodType)
          AND (:minQuantity IS NULL OR f.quantityValue >= :minQuantity)
          AND (:maxQuantity IS NULL OR f.quantityValue <= :maxQuantity)
        """)
    Page<FoodListing> browseListings(
        ListingStatus status,
        FoodType foodType,
        java.math.BigDecimal minQuantity,
        java.math.BigDecimal maxQuantity,
        boolean includeExpired,
        Pageable pageable);

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
