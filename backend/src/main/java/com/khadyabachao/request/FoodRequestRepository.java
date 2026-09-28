package com.khadyabachao.request;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface FoodRequestRepository extends JpaRepository<FoodRequest, UUID> {

    // EntityGraph avoids the 3N+1 (listing + recipient lazies + a per-row
    // rating-exists query) on the claims inbox and donor listing views.
    @EntityGraph(attributePaths = {"listing", "recipient"})
    List<FoodRequest> findByRecipientIdOrderByRequestedAtDesc(UUID recipientId);

    @EntityGraph(attributePaths = {"listing", "recipient"})
    List<FoodRequest> findByListingIdOrderByRequestedAtAsc(UUID listingId);

    boolean existsByListingIdAndRecipientId(UUID listingId, UUID recipientId);

    /** Ids of the given requests this rater has already rated (batch check). */
    @Query("""
        SELECT r.request.id FROM Rating r
        WHERE r.request.id IN :requestIds AND r.rater.id = :raterId
        """)
    List<UUID> findRatedRequestIds(List<UUID> requestIds, UUID raterId);

    /**
     * Transaction-safe participant check that never navigates lazy
     * associations — used by the STOMP SUBSCRIBE guard, which runs outside
     * any persistence context.
     */
    @Query("""
        SELECT CASE WHEN COUNT(r) > 0 THEN TRUE ELSE FALSE END
        FROM FoodRequest r
        WHERE r.id = :requestId
          AND (r.listing.donor.id = :userId OR r.recipient.id = :userId)
        """)
    boolean existsParticipant(UUID requestId, UUID userId);

    @Query("""
        SELECT CASE WHEN COUNT(r) > 0 THEN TRUE ELSE FALSE END
        FROM FoodRequest r
        WHERE r.listing.id = :listingId AND r.status = 'ACCEPTED'
        """)
    boolean existsAcceptedByListingId(UUID listingId);

    long countByRecipientId(UUID recipientId);

    @Query("""
        SELECT COUNT(r) FROM FoodRequest r
        WHERE r.recipient.id = :recipientId AND r.listing.status = 'COMPLETED'
        """)
    long countCompletedByRecipient(UUID recipientId);

    @Query("""
        SELECT COALESCE(SUM(r.listing.quantityValue), 0)
        FROM FoodRequest r
        WHERE r.recipient.id = :recipientId AND r.listing.status = 'COMPLETED'
          AND r.status = 'ACCEPTED'
        """)
    java.math.BigDecimal sumReceivedByRecipient(UUID recipientId);
}
