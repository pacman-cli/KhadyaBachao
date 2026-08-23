package com.khadyabachao.chat;

import com.khadyabachao.request.FoodRequest;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pickup_schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PickupSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false, unique = true)
    private FoodRequest request;

    @Column(name = "agreed_time", nullable = false)
    private Instant agreedTime;

    @Column(name = "agreed_location", nullable = false, columnDefinition = "text")
    private String agreedLocation;

    @Column(name = "confirmed_by_donor", nullable = false)
    @Builder.Default
    private boolean confirmedByDonor = false;

    @Column(name = "confirmed_by_recipient", nullable = false)
    @Builder.Default
    private boolean confirmedByRecipient = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ScheduleStatus status = ScheduleStatus.PROPOSED;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
