package com.khadyabachao.listing;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Marks listings EXPIRED once their pickup deadline passes.
 * Runs every minute; all timestamps are UTC (Instant).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ListingExpiryJob {

    private final FoodListingRepository listingRepository;
    private final ListingEventPublisher eventPublisher;

    @Scheduled(fixedDelay = 60_000, initialDelay = 30_000)
    @Transactional
    public void expireOverdueListings() {
        var expired = listingRepository.findByStatusAndPickupDeadlineBefore(
            ListingStatus.AVAILABLE, Instant.now());
        expired.forEach(l -> {
            l.setStatus(ListingStatus.EXPIRED);
            eventPublisher.listingChanged(l.getId(), "EXPIRED", ListingStatus.EXPIRED);
        });
        if (!expired.isEmpty()) {
            log.info("Marked {} listing(s) as EXPIRED", expired.size());
        }
    }
}
