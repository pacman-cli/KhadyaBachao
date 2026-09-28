-- V15: Support two-directional ratings and donor/recipient rating averages
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS ratings_request_id_key;

ALTER TABLE ratings ADD COLUMN IF NOT EXISTS rater_id UUID REFERENCES users(id);
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS target_role VARCHAR(20);

-- Migrate existing rows if any
UPDATE ratings
SET rater_id = (SELECT recipient_id FROM food_requests WHERE id = ratings.request_id),
    target_role = 'DONOR'
WHERE rater_id IS NULL;

-- If any test/dummy rating had no request match, default to a fallback rater
UPDATE ratings SET rater_id = rated_user_id WHERE rater_id IS NULL;
UPDATE ratings SET target_role = 'DONOR' WHERE target_role IS NULL;

ALTER TABLE ratings ALTER COLUMN rater_id SET NOT NULL;
ALTER TABLE ratings ALTER COLUMN target_role SET NOT NULL;

-- Unique constraint per (request_id, rater_id)
ALTER TABLE ratings DROP CONSTRAINT IF EXISTS uk_ratings_request_rater;
ALTER TABLE ratings ADD CONSTRAINT uk_ratings_request_rater UNIQUE (request_id, rater_id);

-- Add donor_rating_avg and recipient_rating_avg to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS donor_rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recipient_rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0.00;
