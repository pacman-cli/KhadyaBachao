-- Store instants as TIMESTAMP WITH TIME ZONE so comparisons with now()
-- are timezone-independent regardless of session/client TZ settings.
ALTER TABLE users             ALTER COLUMN created_at TYPE timestamptz;
ALTER TABLE users             ALTER COLUMN updated_at TYPE timestamptz;
ALTER TABLE organizations     ALTER COLUMN verified_at TYPE timestamptz;

ALTER TABLE food_listings     ALTER COLUMN prepared_at      TYPE timestamptz;
ALTER TABLE food_listings     ALTER COLUMN pickup_deadline  TYPE timestamptz;
ALTER TABLE food_listings     ALTER COLUMN created_at       TYPE timestamptz;
