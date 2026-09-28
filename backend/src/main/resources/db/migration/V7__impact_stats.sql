-- Phase 7: impact tracking
ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS stats_daily (
    date                     DATE PRIMARY KEY,
    total_kg_rescued         NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_listings           INT NOT NULL DEFAULT 0,
    total_completed_pickups  INT NOT NULL DEFAULT 0
);
