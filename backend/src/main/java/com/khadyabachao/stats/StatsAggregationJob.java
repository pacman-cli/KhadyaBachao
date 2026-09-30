package com.khadyabachao.stats;

import java.time.LocalDate;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

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
        // Bucket in UTC explicitly: `::date` alone uses the Postgres session
        // timezone, which shifts day boundaries for rows completed near
        // midnight whenever the server TZ isn't UTC (stats-audit finding).
        jdbc.update(
                """
                        INSERT INTO stats_daily (date, total_completed_pickups, total_kg_rescued, total_listings)
                        SELECT d::date,
                               COUNT(f.id),
                               COALESCE(SUM(f.quantity_value), 0),
                               0
                        FROM generate_series(
                            COALESCE((SELECT MIN(completed_at AT TIME ZONE 'UTC')::date FROM food_listings WHERE status = 'COMPLETED'), CURRENT_DATE AT TIME ZONE 'UTC'),
                            CURRENT_DATE AT TIME ZONE 'UTC',
                            interval '1 day'
                        ) AS d
                        LEFT JOIN food_listings f
                          ON (f.completed_at AT TIME ZONE 'UTC')::date = d::date AND f.status = 'COMPLETED'
                        GROUP BY d
                        ORDER BY d
                        """);
        // total_listings per day counts all posts created that day
        jdbc.update("""
                UPDATE stats_daily s
                SET total_listings = c.cnt
                FROM (
                    SELECT (created_at AT TIME ZONE 'UTC')::date AS d, COUNT(*) AS cnt
                    FROM food_listings GROUP BY (created_at AT TIME ZONE 'UTC')::date
                ) c
                WHERE s.date = c.d
                """);
    }

    public record DailyStat(LocalDate date, double rescued, int listings, int pickups) {
    }
}
