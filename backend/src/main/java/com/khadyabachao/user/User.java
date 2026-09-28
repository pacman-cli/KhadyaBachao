package com.khadyabachao.user;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "firebase_uid", unique = true)
    private String firebaseUid;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String email;

    @Column(length = 50)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private UserRole role;

    @Column(name = "profile_photo_url", columnDefinition = "text")
    private String profilePhotoUrl;

    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private boolean verified = false;

    /** Soft-delete flag; deactivated users cannot authenticate. */
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "rating_avg", nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(name = "donor_rating_avg", nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal donorRatingAvg = BigDecimal.ZERO;

    @Column(name = "recipient_rating_avg", nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal recipientRatingAvg = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
