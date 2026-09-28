package com.khadyabachao.listing;

import com.khadyabachao.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "food_listings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FoodListing {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "donor_id", nullable = false)
    private User donor;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "food_type", nullable = false, length = 20)
    private FoodType foodType;

    @Column(name = "quantity_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantityValue;

    @Column(name = "quantity_unit", nullable = false, length = 20)
    private String quantityUnit;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "photo_urls", columnDefinition = "text[]")
    @Builder.Default
    private List<String> photoUrls = new ArrayList<>();

    @Column(name = "prepared_at")
    private Instant preparedAt;

    @Column(name = "pickup_deadline", nullable = false)
    private Instant pickupDeadline;

    @Column(name = "pickup_lat", nullable = false)
    private double pickupLat;

    @Column(name = "pickup_lng", nullable = false)
    private double pickupLng;

    @Column(name = "pickup_address", columnDefinition = "text")
    private String pickupAddress;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ListingStatus status = ListingStatus.AVAILABLE;

    /** Set when a pickup is confirmed complete (used by impact stats). */
    @Column(name = "completed_at")
    private Instant completedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;
}
