package com.khadyabachao.listing;

import com.khadyabachao.user.User;
import com.khadyabachao.user.UserRole;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ListingResponse(
    UUID id,
    UUID donorId,
    String donorName,
    boolean donorVerified,
    UserRole donorRole,
    String title,
    String description,
    FoodType foodType,
    BigDecimal quantityValue,
    String quantityUnit,
    List<String> photoUrls,
    Instant preparedAt,
    Instant pickupDeadline,
    double pickupLat,
    double pickupLng,
    String pickupAddress,
    ListingStatus status,
    Instant createdAt
) {

    public static ListingResponse from(FoodListing listing) {
        User donor = listing.getDonor();
        return new ListingResponse(
            listing.getId(),
            donor != null ? donor.getId() : null,
            donor != null ? donor.getName() : null,
            donor != null && donor.isVerified(),
            donor != null ? donor.getRole() : null,
            listing.getTitle(),
            listing.getDescription(),
            listing.getFoodType(),
            listing.getQuantityValue(),
            listing.getQuantityUnit(),
            listing.getPhotoUrls(),
            listing.getPreparedAt(),
            listing.getPickupDeadline(),
            listing.getPickupLat(),
            listing.getPickupLng(),
            listing.getPickupAddress(),
            listing.getStatus(),
            listing.getCreatedAt());
    }
}
