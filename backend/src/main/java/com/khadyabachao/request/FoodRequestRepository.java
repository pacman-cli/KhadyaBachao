package com.khadyabachao.request;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface FoodRequestRepository extends JpaRepository<FoodRequest, UUID> {

    List<FoodRequest> findByRecipientIdOrderByRequestedAtDesc(UUID recipientId);

    List<FoodRequest> findByListingIdOrderByRequestedAtAsc(UUID listingId);

    boolean existsByListingIdAndRecipientId(UUID listingId, UUID recipientId);

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
