-- V13: Enable PostGIS extension and add GEOGRAPHY(POINT) column with GIST spatial index
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add location GEOGRAPHY(POINT, 4326) column
ALTER TABLE food_listings ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Populate location column using existing pickup_lat and pickup_lng coordinates
UPDATE food_listings
SET location = ST_SetSRID(ST_MakePoint(pickup_lng, pickup_lat), 4326)::geography
WHERE pickup_lat IS NOT NULL AND pickup_lng IS NOT NULL;

-- Create spatial GIST index on PostGIS location column
CREATE INDEX IF NOT EXISTS idx_food_listings_postgis_location ON food_listings USING GIST (location);
