package com.khadyabachao.request;

import com.khadyabachao.listing.FoodType;
import com.khadyabachao.listing.ListingStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record RequestResponse(
    UUID id,
    UUID listingId,
    String listingTitle,
    FoodType foodType,
    BigDecimal quantityValue,
    String quantityUnit,
    ListingStatus listingStatus,
    UUID recipientId,
    String recipientName,
    boolean recipientVerified,
    boolean rated,
    RequestStatus status,
    Instant requestedAt
) {

    public static RequestResponse from(FoodRequest request) {
        return from(request, false);
    }

    public static RequestResponse from(FoodRequest request, boolean rated) {
        var listing = request.getListing();
        var recipient = request.getRecipient();
        return new RequestResponse(
            request.getId(),
            listing.getId(),
            listing.getTitle(),
            listing.getFoodType(),
            listing.getQuantityValue(),
            listing.getQuantityUnit(),
            listing.getStatus(),
            recipient != null ? recipient.getId() : null,
            recipient != null ? recipient.getName() : null,
            recipient != null && recipient.isVerified(),
            rated,
            request.getStatus(),
            request.getRequestedAt());
    }
}
