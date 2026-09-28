package com.khadyabachao.user;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Audit B52: client-facing user DTO. Never serialize the {@link User} entity —
 * it exposes firebaseUid, the soft-delete flag and other internal fields.
 */
public record UserResponse(
    UUID id,
    String name,
    String email,
    String phone,
    UserRole role,
    String profilePhotoUrl,
    boolean verified,
    BigDecimal ratingAvg,
    BigDecimal donorRatingAvg,
    BigDecimal recipientRatingAvg,
    Instant createdAt) {

    public static UserResponse from(User u) {
        return new UserResponse(
            u.getId(),
            u.getName(),
            u.getEmail(),
            u.getPhone(),
            u.getRole(),
            u.getProfilePhotoUrl(),
            u.isVerified(),
            u.getRatingAvg(),
            u.getDonorRatingAvg(),
            u.getRecipientRatingAvg(),
            u.getCreatedAt());
    }
}
