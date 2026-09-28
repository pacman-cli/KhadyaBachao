-- Add optimistic/pessimistic locking version column to food_listings
ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
