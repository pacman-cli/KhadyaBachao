-- Phase 2: food listings with geo support (earthdistance MVP; PostGIS can replace later)
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

CREATE TABLE food_listings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id        UUID NOT NULL REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    food_type       VARCHAR(20) NOT NULL CHECK (food_type IN ('COOKED','PACKAGED','RAW')),
    quantity_value  NUMERIC(10,2) NOT NULL,
    quantity_unit   VARCHAR(20) NOT NULL,
    photo_urls      TEXT[] NOT NULL DEFAULT '{}',
    prepared_at     TIMESTAMP,
    pickup_deadline TIMESTAMP NOT NULL,
    pickup_lat      DOUBLE PRECISION NOT NULL,
    pickup_lng      DOUBLE PRECISION NOT NULL,
    pickup_address  TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'
                    CHECK (status IN ('AVAILABLE','CLAIMED','EXPIRED','COMPLETED','CANCELLED')),
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_food_listings_donor ON food_listings(donor_id);
CREATE INDEX idx_food_listings_status ON food_listings(status);
CREATE INDEX idx_food_listings_geo ON food_listings USING gist (ll_to_earth(pickup_lat, pickup_lng));
