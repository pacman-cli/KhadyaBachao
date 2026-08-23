package com.khadyabachao.stats;

import com.khadyabachao.listing.ListingStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Rebuilds the stats_daily aggregate table from completed pickups.
 * Small data volumes make a full refresh cheap; swap for incremental
 * aggregation when that stops being true.
 */
@Component
@RequiredArgsConstructor
public class StatsAggregationJob {

    private final JdbcTemplate jdbc;

    @Scheduled(cron = "0 5 * * * *", zone = "UTC")
    @Transactional
    public void rebuildDailyStats() {
        jdbc.update("DELETE FROM stats_daily");
        jdbc.update("""
            INSERT INTO stats_daily (date, total_completed_pickups, total_kg_rescued, total_listings)
            SELECT d::date,
                   COUNT(f.id),
                   COALESCE(SUM(f.quantity_value), 0),
                   0
            FROM generate_series(
                COALESCE((SELECT MIN(completed_at)::date FROM food_listings WHERE status = 'COMPLETED'), CURRENT_DATE),
                CURRENT_DATE,
                interval '1 day'
            ) AS d
            LEFT JOIN food_listings f
              ON f.completed_at::date = d::date AND f.status = 'COMPLETED'
            GROUP BY d
            ORDER BY d
            """);
        // total_listings per day counts all posts created that day
        jdbc.update("""
            UPDATE stats_daily s
            SET total_listings = c.cnt
            FROM (
                SELECT created_at::date AS d, COUNT(*) AS cnt
                FROM food_listings GROUP BY created_at::date
            ) c
            WHERE s.date = c.d
            """);
    }

    public record DailyStat(LocalDate date, double rescued, int listings, int pickups) {
    }
}
