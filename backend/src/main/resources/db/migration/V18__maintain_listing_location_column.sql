-- V18: keep food_listings.location in sync with pickup coordinates.
-- Live E2E finding: V13 backfilled `location` once at migration time, but the
-- JPA entity has no matching field and nothing maintained the column, so every
-- listing inserted afterwards had location = NULL and the PostGIS nearby
-- search (ST_DWithin on location) silently returned NO results for all new
-- listings. A BEFORE trigger repairs and maintains the column for every write
-- path (JPA, seeds, manual SQL) without adding a hibernate-spatial dependency.

CREATE OR REPLACE FUNCTION food_listings_set_location() RETURNS trigger AS $$
BEGIN
  IF NEW.pickup_lat IS NOT NULL AND NEW.pickup_lng IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.pickup_lng, NEW.pickup_lat), 4326)::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_food_listings_set_location ON food_listings;
CREATE TRIGGER trg_food_listings_set_location
BEFORE INSERT OR UPDATE ON food_listings
FOR EACH ROW EXECUTE FUNCTION food_listings_set_location();

-- Backfill rows written after V13 ran.
UPDATE food_listings
SET location = ST_SetSRID(ST_MakePoint(pickup_lng, pickup_lat), 4326)::geography
WHERE pickup_lat IS NOT NULL AND pickup_lng IS NOT NULL AND location IS NULL;
