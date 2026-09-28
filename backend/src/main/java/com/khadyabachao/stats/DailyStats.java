package com.khadyabachao.stats;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "stats_daily")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyStats {

    @Id
    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "total_kg_rescued", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalKgRescued = BigDecimal.ZERO;

    @Column(name = "total_listings", nullable = false)
    @Builder.Default
    private Integer totalListings = 0;

    @Column(name = "total_completed_pickups", nullable = false)
    @Builder.Default
    private Integer totalCompletedPickups = 0;
}
